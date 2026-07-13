const axios = require('axios');

async function testEndpoints() {
  try {
    const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@example.com',
      password: 'password123'
    });
    
    const cookies = loginRes.headers['set-cookie'];
    if (!cookies) throw new Error("No cookies returned from login");
    
    const axiosInstance = axios.create({
      baseURL: 'http://localhost:3001',
      headers: { Cookie: cookies.join('; ') }
    });

    try {
      const res = await axiosInstance.get('/api/properties');
      console.log("Properties response:", JSON.stringify(res.data).substring(0, 200));
    } catch(err) { console.error("prop err"); }

    try {
      const res = await axiosInstance.get('/api/leases');
      console.log("Leases response:", JSON.stringify(res.data).substring(0, 200));
    } catch(err) { console.error("lease err"); }

    try {
      const res = await axiosInstance.get('/api/auth/me');
      console.log("Profile response:", JSON.stringify(res.data).substring(0, 200));
    } catch(err) { console.error("profile err"); }

  } catch (err) {
    console.error("Login failed:", err.message);
  }
}

testEndpoints();
