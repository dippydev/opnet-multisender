import { Blockchain } from '@btc-vision/btc-runtime/runtime';
import { revertOnError } from '@btc-vision/btc-runtime/runtime/abort/abort';
import { BobMultiSender } from './BobMultiSender';

// Contract factory
Blockchain.contract = (): BobMultiSender => {
    return new BobMultiSender();
};

// Required runtime exports
export * from '@btc-vision/btc-runtime/runtime/exports';

// Required abort handler
export function abort(message: string, fileName: string, line: u32, column: u32): void {
    revertOnError(message, fileName, line, column);
}
