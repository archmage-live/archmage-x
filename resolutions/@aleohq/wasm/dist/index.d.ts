export {
    initThreadPool,
    Address,
    ExecutionResponse,
    Private,
    PrivateKey,
    PrivateKeyCiphertext,
    Program,
    ProvingKey,
    RecordCiphertext,
    RecordPlaintext,
    ProgramManager,
    Signature,
    Transaction,
    ViewKey,
    VerifyingKey,
    verifyFunctionExecution,
} from "./crates/aleo_wasm";

export function wasm(opt?: { serverPath?: string, importHook?: (path) => string, initializeHook?: (init, path) => Promise<void> }): Promise<void>;
