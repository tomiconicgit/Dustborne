// File: main.js

async function main() {
    try {
        if (!window.loader || !window.debugger) {
            throw new Error("Critical: Core UI modules (Loader/Debugger) failed to initialize.");
        }
        
        // --- NEW: Orchestration ---
        // 1. Hide the default floating debugger panel.
        window.debugger.hide();
        // 2. Pipe all debugger output to the loader's log container.
        window.debugger.pipeTo(window.loader.logContainer);

        // --- Game Initialization Starts Here ---
        window.loader.updateStatus('Core systems initialized.', 50);
        console.log("Simulating asset loading..."); // This log will now appear in the loader box
        await new Promise(resolve => setTimeout(resolve, 1000)); 

        // Example of a warning during load
        console.warn("Texture 'example.png' is large (2.1MB).");
        await new Promise(resolve => setTimeout(resolve, 500));

        window.loader.updateStatus('Ready to launch.', 90);
        await new Promise(resolve => setTimeout(resolve, 500)); 

        // This will unpipe the debugger and fade the screen
        window.loader.finish();

    } catch (error) {
        if (window.loader) {
            window.loader.fail(error);
        } else {
            // Failsafe if the loader is broken.
            console.error("Fatal error during initialization:", error);
            document.body.innerHTML = `...`; // Fallback HTML
        }
    }
}

main();
