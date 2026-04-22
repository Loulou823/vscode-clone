export function showToast(message: string) {
    // here its gonna create the dom element for the toast
    const toast = document.createElement('div');
    toast.className = 'toast toast-animation';
    toast.innerHTML = message;
    document.body.appendChild(toast);

    // remove the toast after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            document.body.removeChild(toast);
        }
    }, 3000);
}

