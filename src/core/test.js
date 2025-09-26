// file: src/core/test.js

/**
 * This function will be called by the loader after the user clicks "Start Game".
 */
function show() {
    // 1. Create a style element for our success screen
    const styles = `
        body {
            background-color: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            opacity: 0;
            animation: fadeIn 1s forwards;
        }
        @keyframes fadeIn {
            to { opacity: 1; }
        }
        .success-message {
            color: #0f0; /* Green */
            font-family: monospace;
            font-size: 48px;
            font-weight: bold;
            text-shadow: 0 0 10px #0f0;
        }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // 2. Clear the body and add the success message
    document.body.innerHTML = '<div class="success-message">Success</div>';
    console.log("Test script executed: Success screen displayed.");
}

// Export the function so the loader can call it.
export { show };
