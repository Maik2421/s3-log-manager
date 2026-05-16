async function fetchFiles() {
    const response = await fetch('/api/logs');
    const files = await response.json();
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    files.forEach(file => {
        const li = document.createElement('li');
        li.textContent = file;
        fileList.appendChild(li);
    });
}

document.getElementById('logForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const date = document.getElementById('date').value;
    const message = document.getElementById('message').value;
    if (!date || !message) {
        alert('Ambos campos son requeridos');
        return;
    }

    const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, message }),
    });

    if (res.ok) {
        document.getElementById('message').value = '';
        fetchFiles(); // Refresh
    } else {
        const data = await res.json();
        alert('Error: ' + data.error);
    }
});

window.onload = fetchFiles;
