import { main } from '@app/main';
import { logger } from '@app/common/logger';

main().catch(error => {
    if (!(error instanceof Error)) throw new Error(String(error));

    logger.error('Application crashed', {
        error,
    });

    // Ensure application exists
    // @TODO: find how what's holding the app open
    //        it's very likely a TCP connection
    process.exit(1);
});
