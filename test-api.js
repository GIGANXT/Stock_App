const axios = require('axios');

async function testApi() {
  try {
    console.log('Calling API endpoint to store data...');
    const response = await axios.get('http://localhost:3000/api/3_month_mcx');
    console.log('API Response:', JSON.stringify(response.data, null, 2));
    
    console.log('\nChecking if data was stored...');
    const viewResponse = await axios.get('http://localhost:3000/api/3_month_mcx?action=view');
    console.log('View Response:', JSON.stringify(viewResponse.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testApi(); 