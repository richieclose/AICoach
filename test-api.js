// Node v18+ has global fetch

async function test() {
    try {
        const res = await fetch('http://localhost:3000/api/coach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'generate_workout',
                data: { userRequest: 'test', ftp: 200 }
            })
        });
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body:', text);
    } catch (e) {
        console.error(e);
    }
}

test();
