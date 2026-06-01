/**
 * Demo backend — Supabase-only, no blockchain.
 *
 * Exposes the same surface as the on-chain helpers in `blockchain.ts`,
 * but every read/write hits Supabase tables instead of Polygon. It lets
 * you exercise the whole app — create elections, register NINs, cast
 * votes, view the explorer — with zero gas, no MetaMask, no RPC.
 *
 * Activated by VITE_DEMO_MODE=true (default). `blockchain.ts` re-routes
 * each public function to one of these when the flag is on.
 */
import { supabase } from './supabase';
import { cache } from '../lib/cache';
import type { Candidate } from '../types/candidate';
import type {
  ElectionInfo,
  Transaction,
  PaginatedTransactions,
  TransactionResult,
} from './blockchain';

// ----- Synthetic tx hash + block helpers ----------------------------------
// We need stable, unique-looking strings so the explorer rendering and
// localStorage cache behave the same as they would on chain.

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

function syntheticTxHash(): string {
  return '0x' + randomHex(32);
}

// Each demo "block" advances a counter so newer txs sort above older ones.
function nextBlockNumber(): number {
  const k = 'demo_next_block';
  const current = Number(localStorage.getItem(k) ?? 1_000_000);
  localStorage.setItem(k, String(current + 1));
  return current;
}

// ----- Cache invalidation -------------------------------------------------

function bustElectionCache(electionId?: number) {
  cache.delete('activeElectionId');
  if (electionId !== undefined) {
    cache.delete(`electionInfo_${electionId}`);
    cache.delete(`candidates_${electionId}`);
    cache.delete(`totalVotes_${electionId}`);
  }
  // tx pages
  for (let i = 0; i < 20; i++) {
    cache.delete(`transactions_latest_${i * 25}`);
  }
  cache.delete('transactions_latest_25');
  cache.delete('transactions_latest_100');
}

// ----- Reads --------------------------------------------------------------

export async function getActiveElectionId(): Promise<number> {
  const cacheKey = 'activeElectionId';
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  // `currentElectionId` in the real contract is the NEXT id to mint, so it
  // equals max(id) + 1. Returning count + 1 only works if ids are dense,
  // which they are with bigserial since we never delete via the UI.
  const { count, error } = await supabase
    .from('elections')
    .select('*', { count: 'exact', head: true });

  if (error || count == null) {
    console.error('[demo] getActiveElectionId failed:', error);
    return 0;
  }
  const next = count + 1;
  cache.set(cacheKey, next, 15_000);
  return next;
}

export async function getElectionInfo(
  electionId: number
): Promise<ElectionInfo | null> {
  const cacheKey = `electionInfo_${electionId}`;
  const cached = cache.get<ElectionInfo | null>(cacheKey);
  if (cached !== null) return cached;

  const [{ data: election }, { count: candidateCount }] = await Promise.all([
    supabase.from('elections').select('*').eq('id', electionId).maybeSingle(),
    supabase
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', electionId),
  ]);

  if (!election) {
    cache.set(cacheKey, null, 30_000);
    return null;
  }

  const info: ElectionInfo = {
    name: election.name,
    startTime: new Date(election.start_time),
    endTime: new Date(election.end_time),
    active: election.active,
    candidateCount: candidateCount ?? 0,
  };
  cache.set(cacheKey, info, 60_000);
  return info;
}

export async function getAllCandidates(
  electionId: number
): Promise<Candidate[]> {
  const cacheKey = `candidates_${electionId}`;
  const cached = cache.get<Candidate[]>(cacheKey);
  if (cached !== null) return cached;

  const [{ data: rows }, { data: voteRows }] = await Promise.all([
    supabase
      .from('candidates')
      .select('idx, name, party')
      .eq('election_id', electionId)
      .order('idx', { ascending: true }),
    supabase
      .from('votes')
      .select('candidate_idx')
      .eq('election_id', electionId),
  ]);

  if (!rows) {
    cache.set(cacheKey, [], 15_000);
    return [];
  }

  // Tally votes per candidate index
  const tally = new Map<number, number>();
  (voteRows ?? []).forEach((v) => {
    tally.set(v.candidate_idx, (tally.get(v.candidate_idx) ?? 0) + 1);
  });

  const candidates: Candidate[] = rows.map((r) => ({
    name: r.name,
    party: r.party,
    votes: tally.get(r.idx) ?? 0,
    index: r.idx,
  }));

  cache.set(cacheKey, candidates, 30_000);
  return candidates;
}

export async function getTotalVotes(electionId: number): Promise<number> {
  const cacheKey = `totalVotes_${electionId}`;
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  const { count, error } = await supabase
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('election_id', electionId);

  if (error || count == null) return 0;
  cache.set(cacheKey, count, 30_000);
  return count;
}

// Bundled fetch — same shape as the on-chain helper but a couple of
// Supabase round-trips instead of a multicall.
export interface ElectionBundle {
  info: ElectionInfo;
  candidates: Candidate[];
  totalVotes: number;
}

export async function getElectionsBundle(
  electionIds: number[]
): Promise<Map<number, ElectionBundle>> {
  const result = new Map<number, ElectionBundle>();
  if (electionIds.length === 0) return result;

  // Cache hits first
  const missing: number[] = [];
  for (const id of electionIds) {
    const info = cache.get<ElectionInfo>(`electionInfo_${id}`);
    const candidates = cache.get<Candidate[]>(`candidates_${id}`);
    const totalVotes = cache.get<number>(`totalVotes_${id}`);
    if (info && candidates && totalVotes !== null) {
      result.set(id, { info, candidates, totalVotes });
    } else {
      missing.push(id);
    }
  }
  if (missing.length === 0) return result;

  const [
    { data: elections },
    { data: candidateRows },
    { data: voteRows },
  ] = await Promise.all([
    supabase.from('elections').select('*').in('id', missing),
    supabase
      .from('candidates')
      .select('election_id, idx, name, party')
      .in('election_id', missing)
      .order('idx', { ascending: true }),
    supabase
      .from('votes')
      .select('election_id, candidate_idx')
      .in('election_id', missing),
  ]);

  // Pre-bucket candidates and tallies by election
  const candidatesByElection = new Map<number, Candidate[]>();
  for (const row of candidateRows ?? []) {
    if (!candidatesByElection.has(row.election_id)) {
      candidatesByElection.set(row.election_id, []);
    }
    candidatesByElection.get(row.election_id)!.push({
      name: row.name,
      party: row.party,
      votes: 0,
      index: row.idx,
    });
  }
  const tallyByElection = new Map<number, Map<number, number>>();
  for (const v of voteRows ?? []) {
    if (!tallyByElection.has(v.election_id)) {
      tallyByElection.set(v.election_id, new Map());
    }
    const t = tallyByElection.get(v.election_id)!;
    t.set(v.candidate_idx, (t.get(v.candidate_idx) ?? 0) + 1);
  }

  for (const election of elections ?? []) {
    const id = election.id;
    const candidates = (candidatesByElection.get(id) ?? []).map((c) => ({
      ...c,
      votes: tallyByElection.get(id)?.get(c.index) ?? 0,
    }));
    const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
    const info: ElectionInfo = {
      name: election.name,
      startTime: new Date(election.start_time),
      endTime: new Date(election.end_time),
      active: election.active,
      candidateCount: candidates.length,
    };
    cache.set(`electionInfo_${id}`, info, 60_000);
    cache.set(`candidates_${id}`, candidates, 30_000);
    cache.set(`totalVotes_${id}`, totalVotes, 30_000);
    result.set(id, { info, candidates, totalVotes });
  }

  return result;
}

// ----- Writes -------------------------------------------------------------

export async function createElection(
  name: string,
  startTime: Date,
  endTime: Date,
  candidateNames: string[],
  candidateParties: string[],
  createdBy: string = '0xDemoAdmin'
): Promise<TransactionResult> {
  if (candidateNames.length !== candidateParties.length) {
    return {
      success: false,
      error: 'Candidate names and parties must have the same length',
    };
  }

  const { data: election, error: insertErr } = await supabase
    .from('elections')
    .insert({
      name,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      active: true,
      created_by: createdBy,
    })
    .select()
    .single();

  if (insertErr || !election) {
    return {
      success: false,
      error: insertErr?.message ?? 'Failed to create election',
    };
  }

  const candidateRows = candidateNames.map((cName, idx) => ({
    election_id: election.id,
    idx,
    name: cName,
    party: candidateParties[idx],
  }));
  const { error: candErr } = await supabase
    .from('candidates')
    .insert(candidateRows);
  if (candErr) {
    // Best-effort cleanup so we don't leave an orphaned election
    await supabase.from('elections').delete().eq('id', election.id);
    return { success: false, error: candErr.message };
  }

  bustElectionCache(election.id);

  return {
    success: true,
    transactionHash: syntheticTxHash(),
    electionId: election.id,
    from: createdBy,
    to: 'demo:elections',
    blockNumber: nextBlockNumber(),
  };
}

export async function castVote(
  electionId: number,
  candidateIndex: number,
  voterNINHash: string,
  voterAddress: string = '0xDemoVoter'
): Promise<TransactionResult> {
  // Verify election exists and is open
  const info = await getElectionInfo(electionId);
  if (!info) return { success: false, error: 'Election not found' };
  const now = new Date();
  if (now < info.startTime || now > info.endTime || !info.active) {
    return { success: false, error: 'Election is not currently open' };
  }
  if (candidateIndex < 0 || candidateIndex >= info.candidateCount) {
    return { success: false, error: 'Invalid candidate index' };
  }

  const txHash = syntheticTxHash();
  const blockNumber = nextBlockNumber();

  const { error } = await supabase.from('votes').insert({
    election_id: electionId,
    candidate_idx: candidateIndex,
    voter_hash: voterNINHash,
    voter_address: voterAddress,
    tx_hash: txHash,
    block_number: blockNumber,
  });

  if (error) {
    if (error.code === '23505') {
      return {
        success: false,
        error: 'You have already voted in this election.',
      };
    }
    return { success: false, error: error.message };
  }

  bustElectionCache(electionId);

  return {
    success: true,
    transactionHash: txHash,
    electionId,
    from: voterAddress,
    to: 'demo:votes',
    blockNumber,
  };
}

// ----- Transactions feed for the Explorer ---------------------------------

export async function getContractTransactions(
  startBlock?: number,
  pageSize: number = 25
): Promise<PaginatedTransactions> {
  const cacheKey = `transactions_${startBlock ?? 'latest'}_${pageSize}`;
  const cached = cache.get<PaginatedTransactions>(cacheKey);
  if (cached !== null) return cached;

  try {
    // Pull recent elections + votes, fold into a single tx-like list.
    const [{ data: elections }, { data: votes }] = await Promise.all([
      supabase
        .from('elections')
        .select('id, name, created_at, created_by, start_time')
        .order('id', { ascending: false })
        .limit(pageSize),
      supabase
        .from('votes')
        .select('tx_hash, block_number, voter_address, created_at, election_id')
        .order('block_number', { ascending: false })
        .limit(pageSize),
    ]);

    const transactions: Transaction[] = [];

    for (const e of elections ?? []) {
      transactions.push({
        hash: '0xdemo' + String(e.id).padStart(58, '0').slice(0, 60),
        timestamp: new Date(e.created_at ?? e.start_time),
        from: e.created_by ?? '0xDemoAdmin',
        to: 'demo:elections',
        method: 'createElection',
        value: '0',
        blockNumber: 900_000 + e.id, // synthetic
        status: 'Confirmed',
      });
    }
    for (const v of votes ?? []) {
      transactions.push({
        hash: v.tx_hash,
        timestamp: new Date(v.created_at),
        from: v.voter_address,
        to: 'demo:votes',
        method: 'castVote',
        value: '0',
        blockNumber: Number(v.block_number),
        status: 'Confirmed',
      });
    }

    transactions.sort((a, b) => b.blockNumber - a.blockNumber);
    const result: PaginatedTransactions = {
      transactions: transactions.slice(0, pageSize),
      hasMore: transactions.length > pageSize,
      nextBlock: undefined,
    };
    cache.set(cacheKey, result, 30_000);
    return result;
  } catch (err) {
    console.error('[demo] getContractTransactions failed:', err);
    return { transactions: [], hasMore: false };
  }
}

// ----- Admin check --------------------------------------------------------

// Same wallet allow-list as the real path; in demo mode anyone with that
// address (or with the wallet stored in `admin_config.admin_address`)
// gets admin powers.
export async function isAdmin(address: string): Promise<boolean> {
  if (!address) return false;
  try {
    const { data } = await supabase
      .from('admin_config')
      .select('admin_address')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    const allow = (data?.admin_address ?? '').toLowerCase();
    return allow !== '' && allow === address.toLowerCase();
  } catch {
    return false;
  }
}
