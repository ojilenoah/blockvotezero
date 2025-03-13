export function BlockchainTransparency() {
  return (
    <div>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Blockchain Transparency</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>All votes are recorded on the blockchain for complete transparency and verification.</p>
          </div>
          <div className="mt-4">
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center">
                  <div className="w-20 text-xs font-medium text-gray-500">Transaction</div>
                  <div className="flex-1 text-xs font-mono text-gray-900 truncate">0x72f9d8198a84a68b74734d9a57439729e426f2b98c7f7b0d9dcf37e12738532a</div>
                </div>
                <div className="flex items-center">
                  <div className="w-20 text-xs font-medium text-gray-500">Block</div>
                  <div className="flex-1 text-xs text-gray-900">#15,732,851</div>
                </div>
                <div className="flex items-center">
                  <div className="w-20 text-xs font-medium text-gray-500">Contract</div>
                  <div className="flex-1 text-xs font-mono text-gray-900 truncate">0x9e56b05616db196b1374e6731f56b4a9e6c4c888</div>
                </div>
              </div>
            </div>
            <div className="mt-4 text-sm">
              <a href="#" className="font-medium text-primary hover:text-blue-500">
                View full blockchain details <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
