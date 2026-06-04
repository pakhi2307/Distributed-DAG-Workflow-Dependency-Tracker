
async function testFlow() {
  try {
    const baseURL = 'http://localhost:5000/api';
    
    // 1. Create Org
    const email = 'test' + Date.now() + '@example.com';
    console.log("Creating org with email:", email);
    const orgRes = await fetch(`${baseURL}/organizations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: "Test Org",
        adminName: "Test Admin",
        adminEmail: email,
        adminPassword: "password123"
      })
    });
    const orgData = await orgRes.json();
    console.log("Org created:", orgData.message);

    // 2. Login
    const loginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        password: "password123"
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    const user = loginData.user;
    console.log("Logged in, user:", user);

    // 3. Create Project
    const projRes = await fetch(`${baseURL}/projects`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
        name: "My API Project",
        status: "ACTIVE"
      })
    });
    const projData = await projRes.json();
    console.log("Project created:", projData.message, projData.data);

    // 4. Fetch Projects
    const fetchRes = await fetch(`${baseURL}/projects/org/${user.orgId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const fetchJson = await fetchRes.json();
    console.log("Fetched projects count:", fetchJson.length);
    console.log("Fetched projects:", fetchJson);

  } catch (err) {
    console.error("Error:", err);
  }
}

testFlow();
