var unhandledRejectionExitCode = 0;
process.on('unhandledRejection', function (reason) {
    console.log('unhandled rejection:', reason);
    unhandledRejectionExitCode = 1;
    throw reason;
});
process.prependListener('exit', function (code) {
    if (code === 0) {
        process.exit(unhandledRejectionExitCode);
    }
});
//# sourceMappingURL=mocha-unhandled.js.map