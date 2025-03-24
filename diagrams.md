# Diagrams for Chapter 4: Design and Implementation

## 1. System Architecture Design

### 1.1 Architecture Overview
*Reference: Chapter 4, Section 1.1 Architecture Overview*

```mermaid
graph TD
    subgraph "Frontend Layer"
        UI[React User Interface]
        MetaMask[MetaMask Integration]
        PhantomWallet[Phantom Wallet Integration]
    end
    
    subgraph "Backend Services"
        ExpressAPI[Express.js API Server]
        AuthService[Authentication Service]
        DBService[Database Service]
    end
    
    subgraph "Blockchain Layer"
        SmartContract[Voting Smart Contract]
        Blockchain[Polygon Amoy Testnet]
        BlockExplorer[Transaction Explorer]
    end
    
    subgraph "Data Storage"
        Supabase[(Supabase Database)]
    end
    
    UI --> MetaMask
    UI --> PhantomWallet
    UI --> ExpressAPI
    MetaMask --> SmartContract
    PhantomWallet --> SmartContract
    ExpressAPI --> AuthService
    ExpressAPI --> DBService
    DBService --> Supabase
    SmartContract --> Blockchain
    Blockchain --> BlockExplorer
```

### 1.3 Data Flow
*Reference: Chapter 4, Section 1.3 Data Flow*

```mermaid
sequenceDiagram
    participant Voter
    participant UI as User Interface
    participant API as Express API
    participant DB as Supabase
    participant SC as Smart Contract
    participant BC as Blockchain
    
    Voter->>UI: Register with NIN
    UI->>API: Submit registration
    API->>DB: Store voter information
    DB-->>API: Confirmation
    API-->>UI: Registration status
    UI-->>Voter: Registration complete
    
    Voter->>UI: Connect wallet
    UI->>Voter: Request wallet connection
    Voter->>UI: Approve connection
    
    Voter->>UI: Cast vote for candidate
    UI->>SC: Send vote transaction
    SC->>BC: Record vote on blockchain
    BC-->>SC: Transaction confirmation
    SC-->>UI: Vote confirmation
    UI->>API: Update voter status
    API->>DB: Mark as voted
    UI-->>Voter: Vote confirmed with receipt
```

## 2. Implementation of Key Features

### 2.1 Voter Registration - Registration Flow
*Reference: Chapter 4, Section 2.1 Voter Registration - Registration Flow*

```mermaid
sequenceDiagram
    Actor Voter
    participant UI as Registration Form
    participant Validation as Form Validation
    participant Web3 as Web3 Wallet
    participant API as Submission Service
    participant DB as Database
    
    Voter->>UI: Enter NIN Details
    UI->>Validation: Validate Format
    Validation-->>UI: Format Valid/Invalid
    
    alt Invalid Format
        UI-->>Voter: Show Format Error
    else Valid Format
        UI->>Web3: Check Wallet Connection
        
        alt Wallet Not Connected
            Web3-->>UI: Return Not Connected
            UI-->>Voter: Request Wallet Connection
        else Wallet Connected
            Web3-->>UI: Return Wallet Address
            UI->>API: Submit NIN with Wallet Address
            API->>DB: Check if NIN locked by admin
            DB-->>API: Lock Status
            
            alt NIN Submission Locked
                API-->>UI: Return Locked Error
                UI-->>Voter: Display Lock Message
            else Submission Allowed
                API->>DB: Check if Wallet Already Registered
                DB-->>API: Existing Registration
                
                alt Already Registered
                    API-->>UI: Return Already Registered Error
                    UI-->>Voter: Display Already Registered Message
                else Not Registered
                    API->>DB: Save NIN with Pending Status
                    DB-->>API: Confirm Save
                    API-->>UI: Return Success
                    UI-->>Voter: Display Confirmation Message
                end
            end
        end
    end
```

### 2.1 Voter Registration - Security Measures
*Reference: Chapter 4, Section 2.1 Voter Registration - Security Measures*

```mermaid
graph TD
    subgraph "Security Infrastructure"
        A[Input Validation] --> B[Format Verification]
        A[Input Validation] --> C[Checksum Validation]
        
        D[Binding Mechanism] --> E[Wallet-NIN Linkage]
        D[Binding Mechanism] --> F[Duplicate Prevention]
        
        G[Data Protection] --> H[Hashing Algorithm]
        G[Data Protection] --> I[Admin Verification]
        
        J[Access Control] --> K[Role-Based Permissions]
        J[Access Control] --> L[Administrative Lock]
    end
```

### 2.2 Ballot Casting - Vote Casting Flow
*Reference: Chapter 4, Section 2.2 Ballot Casting - Vote Casting Flow*

```mermaid
sequenceDiagram
    participant Voter
    participant UI as User Interface
    participant Crypto as Cryptography Service
    participant Web3 as Web3 Provider
    participant SC as Smart Contract
    participant BC as Blockchain
    participant DB as Database
    
    Voter->>UI: Select Candidate
    Voter->>UI: Click "Cast Vote"
    
    UI->>Crypto: Request NIN Hashing
    Crypto-->>UI: Return Hash Value
    
    UI->>Web3: Initialize Provider
    Web3->>Voter: Request Transaction Approval
    Voter->>Web3: Confirm Transaction
    
    Web3->>SC: Check if Already Voted
    SC-->>Web3: Return Voting Status
    
    alt Already Voted
        Web3-->>UI: Return Error
        UI-->>Voter: Display "Already Voted" Message
    else Not Voted Yet
        Web3->>SC: Send Vote Transaction
        SC->>BC: Record Vote on Blockchain
        BC-->>SC: Confirm Transaction
        SC-->>Web3: Return Transaction Receipt
        Web3-->>UI: Provide Transaction Hash
        
        UI->>DB: Update Voter Status
        DB-->>UI: Confirm Status Update
        
        UI-->>Voter: Display Confirmation Screen
    end
```

### 2.2 Ballot Casting - Blockchain Vote Recording Mechanism
*Reference: Chapter 4, Section 2.2 Ballot Casting - Blockchain Vote Recording Mechanism*

```mermaid
graph TD
    subgraph "Voting Transaction Flow"
        A[Vote Initiation] --> B[Identity Verification]
        B --> C[Duplicate Vote Check]
        
        C -->|Not Voted| D[Smart Contract Call]
        C -->|Already Voted| E[Error Response]
        
        D --> F[Transaction Creation]
        F --> G[Transaction Signing]
        G --> H[Network Broadcasting]
        
        H --> I[Blockchain Validation]
        I --> J[Block Creation]
        J --> K[Transaction Confirmation]
        
        K --> L[Receipt Generation]
        L --> M[Status Update]
    end
```

### 2.2 Ballot Casting - Anonymity and Privacy Mechanisms
*Reference: Chapter 4, Section 2.2 Ballot Casting - Anonymity and Privacy Mechanisms*

```mermaid
graph TD
    subgraph "Privacy Protection Framework"
        A[Voter Identity] --> B[Cryptographic Hashing]
        B --> C[SHA-256 Algorithm]
        C --> D[NIN Hash Generation]
        
        E[Smart Contract] --> F[Hash-Based Verification]
        F --> G[Double-Voting Prevention]
        
        H[Database Design] --> I[Data Segregation]
        I --> J[No Vote-Identity Links]
        
        K[Network Privacy] --> L[Encrypted Connections]
        L --> M[Secure Data Transmission]
    end
```

## 3. Smart Contract Development

### 3.1 Smart Contract Structure
*Reference: Chapter 4, Section 3.1 Smart Contract Structure*

```mermaid
classDiagram
    class VotingSystem {
        +address admin
        +uint256 activeElectionId
        +uint256 electionCount
        +mapping(uint256 => Election) elections
        +constructor()
        +createElection(name, startTime, endTime, candidateNames, candidateParties) uint256
        +activateElection(electionId) void
        +castVote(electionId, candidateId, voterHash) void
        +changeAdmin(newAdmin) void
        +getElectionInfo(electionId) tuple
        +getCandidate(electionId, candidateId) tuple
        +hasVoted(electionId, voterHash) bool
        +getActiveElectionId() uint256
    }
    
    class Election {
        +string name
        +uint256 startTime
        +uint256 endTime
        +bool active
        +uint256 candidateCount
        +mapping(uint256 => Candidate) candidates
        +mapping(bytes32 => bool) hasVoted
    }
    
    class Candidate {
        +string name
        +string party
        +uint256 votes
    }
    
    class Events {
        +ElectionCreated(electionId, name)
        +VoteCast(electionId, candidateId)
        +AdminChanged(oldAdmin, newAdmin)
    }
    
    VotingSystem "1" -- "many" Election : manages
    Election "1" -- "many" Candidate : contains
    VotingSystem -- Events : emits
```

## 4. User Interface Design

### 4.1 User Interface Wireframes - Voter Registration Page
*Reference: Chapter 4, Section 4.1 User Interface Wireframes - Voter Registration Page*

```mermaid
graph TD
    subgraph Voter Registration Screen
        A[Header/Navigation] --> B[Registration Form]
        B --> C[NIN Input Field]
        B --> D[Terms & Conditions Checkbox]
        B --> E[Submit Button]
        F[Wallet Connection Status] --> G[Connect Wallet Button]
    end
```

### 4.1 User Interface Wireframes - Voting Page
*Reference: Chapter 4, Section 4.1 User Interface Wireframes - Voting Page*

```mermaid
graph TD
    subgraph Voting Screen
        A[Header/Navigation] --> B[Active Election Information]
        B --> C[Countdown Timer]
        A --> D[Candidate Selection Grid]
        D --> E[Candidate Cards]
        E --> F[Vote Button]
        F --> G[Transaction Confirmation]
    end
```

### 4.1 User Interface Wireframes - Admin Dashboard
*Reference: Chapter 4, Section 4.1 User Interface Wireframes - Admin Dashboard*

```mermaid
graph TD
    subgraph Admin Dashboard
        A[Admin Header] --> B[Election Management]
        A --> C[NIN Verification Panel]
        A --> D[System Settings]
        B --> E[Create Election Form]
        B --> F[Election Status Controls]
        C --> G[NIN Approval Table]
        D --> H[Admin Controls]
    end
```

### 4.2 User Interface Implementation - Voting Interface Architecture
*Reference: Chapter 4, Section 4.2 User Interface Implementation - Voting Interface Architecture*

```mermaid
graph TD
    subgraph "Vote Page Component Architecture"
        A[Vote Page] --> B[State Management]
        A --> C[Component Flow]
        A --> D[API Integration]
        
        B --> B1[User Input State]
        B --> B2[Election Data State]
        B --> B3[Transaction State]
        
        C --> C1[Wallet Connection]
        C --> C2[NIN Entry]
        C --> C3[Candidate Selection]
        C --> C4[Transaction Confirmation]
        
        D --> D1[Blockchain Calls]
        D --> D2[Database Updates]
    end
```

### 4.2 User Interface Implementation - Admin Interface Architecture
*Reference: Chapter 4, Section 4.2 User Interface Implementation - Admin Interface Architecture*

```mermaid
graph TD
    subgraph "Admin Dashboard Architecture"
        A[Admin Dashboard] --> B[Authentication Layer]
        A --> C[Management Modules]
        
        B --> B1[Admin Wallet Verification]
        B --> B2[Permission System]
        
        C --> C1[Election Creator]
        C --> C2[NIN Manager]
        C --> C3[System Settings]
        
        C1 --> D1[Form Management]
        C1 --> D2[Candidate Controls]
        C1 --> D3[Date Selection]
        
        C2 --> E1[Verification Controls]
        C2 --> E2[Voter Database]
        
        C3 --> F1[Admin Transfer]
        C3 --> F2[System Lockdown]
    end
```

## 5. Testing Phase

### 5.1 Testing Approach
*Reference: Chapter 4, Section 5.1 Testing Approach*

```mermaid
graph TD
    A[Testing Strategy] --> B[Unit Testing]
    A --> C[Integration Testing]
    A --> D[End-to-End Testing]
    A --> E[User Acceptance Testing]
    
    B --> B1[Smart Contract Functions]
    B --> B2[React Components]
    B --> B3[Utility Functions]
    
    C --> C1[Contract-Frontend Integration]
    C --> C2[Database-Backend Integration]
    C --> C3[API Endpoint Testing]
    
    D --> D1[Voter Registration Flow]
    D --> D2[Voting Process Flow]
    D --> D3[Admin Management Flow]
    
    E --> E1[Usability Testing]
    E --> E2[Security Testing]
    E --> E3[Performance Testing]
```

### 5.2 Unit Testing
*Reference: Chapter 4, Section 5.2 Unit Testing*

```mermaid
graph TD
    subgraph "Unit Testing Framework"
        A[Test Suites] --> B[Smart Contract Tests]
        A --> C[UI Component Tests]
        A --> D[Utility Function Tests]
        
        B --> B1[Election Creation Tests]
        B --> B2[Vote Casting Tests]
        B --> B3[Admin Functions Tests]
        
        C --> C1[Form Validation Tests]
        C --> C2[UI Rendering Tests]
        C --> C3[State Management Tests]
        
        D --> D1[NIN Hashing Tests]
        D --> D2[Data Formatting Tests]
        D --> D3[Validation Function Tests]
    end
```

### 5.3 Integration Testing
*Reference: Chapter 4, Section 5.3 Integration Testing*

```mermaid
flowchart TD
    A[Setup Test Environment] --> B[Initialize Contract Connection]
    B --> C[Create Test Election]
    C --> D[Activate Election]
    D --> E[Execute Test Cases]
    
    E --> F[Vote Casting Tests]
    E --> G[Query Function Tests]
    E --> H[Admin Function Tests]
    
    F --> F1[Single Vote Test]
    F --> F2[Double Vote Prevention Test]
    F --> F3[Invalid Vote Test]
    
    G --> G1[Election Info Retrieval]
    G --> G2[Candidate Data Retrieval]
    G --> G3[Vote Status Verification]
    
    H --> H1[Permission Tests]
    H --> H2[Election Management Tests]
    
    subgraph "Integration Test Results"
        I[Test Reports]
        J[Coverage Analysis]
        K[Performance Metrics]
    end
    
    F --> I
    G --> I
    H --> I
    I --> J
    I --> K
```

### 5.4 End-to-End Testing
*Reference: Chapter 4, Section 5.4 End-to-End Testing*

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Frontend
    participant API
    participant DB
    participant Blockchain
    
    Note over User,Blockchain: E2E Test: Complete Voting Flow
    
    User->>Browser: Visit Voting Page
    Browser->>Frontend: Render Application
    Frontend->>Browser: Display Wallet Connection
    
    User->>Browser: Connect Wallet (Mocked)
    Browser->>Frontend: Send Wallet Address
    Frontend->>API: Verify Wallet Status
    API->>DB: Query User Registration
    DB-->>API: Return Registration Status
    API-->>Frontend: Confirm Registration
    
    Frontend->>Browser: Display NIN Entry Form
    User->>Browser: Enter NIN
    Browser->>Frontend: Submit NIN
    Frontend->>API: Validate NIN
    API-->>Frontend: NIN Accepted
    
    Frontend->>API: Request Candidate List
    API->>Blockchain: Query Active Election
    Blockchain-->>API: Return Election Data
    API-->>Frontend: Provide Candidate Options
    Frontend->>Browser: Display Candidate Grid
    
    User->>Browser: Select Candidate
    Browser->>Frontend: Register Selection
    User->>Browser: Click "Cast Vote"
    
    Frontend->>Blockchain: Submit Vote Transaction
    Blockchain-->>Frontend: Return Transaction Hash
    Frontend->>API: Update Voting Status
    API->>DB: Mark User as Voted
    DB-->>API: Confirm Status Update
    
    Frontend->>Browser: Display Confirmation Screen
    Browser->>User: Show Success Message
```

## 6. Deployment Strategy

### 6.1 Deployment Process
*Reference: Chapter 4, Section 6.1 Deployment Process*

```mermaid
gantt
    title Deployment Timeline
    dateFormat  YYYY-MM-DD
    section Preparation
    Environment Setup           :prep1, 2025-01-15, 7d
    Smart Contract Audit        :prep2, after prep1, 14d
    section Deployment
    Contract Deployment         :dep1, after prep2, 3d
    Backend API Deployment      :dep2, after prep1, 5d
    Frontend Deployment         :dep3, after dep2, 3d
    section Testing
    Integration Verification    :test1, after dep3, 5d
    User Acceptance Testing     :test2, after test1, 7d
    section Launch
    System Monitoring           :launch1, after test2, 3d
    Public Launch               :milestone, after launch1, 0d
```

### 6.2 Deployment Architecture
*Reference: Chapter 4, Section 6.2 Deployment Architecture*

```mermaid
graph TD
    subgraph "Production Environment"
        A[Vercel Frontend] --> B[Express API Server]
        B --> C[Supabase Database]
        A --> D[Polygon Blockchain]
    end
    
    subgraph "Staging Environment"
        E[Staging Frontend] --> F[Staging API Server]
        F --> G[Test Database]
        E --> H[Polygon Testnet]
    end
    
    subgraph "Development Environment"
        I[Local Frontend] --> J[Local API Server]
        J --> K[Local Database]
        I --> L[Local Blockchain]
    end
```