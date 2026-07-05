// CloudFlare Workers - Roblox Key Verification API
// Deploy: npm install -g wrangler && wrangler deploy

import { Router } from 'itty-router';

const router = Router();
let keysDatabase = [];
let adminCreds = {
  username: 'admin',
  password: 'Admin123!'
};

// ==================== CORS HEADERS ====================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight
router.options('*', () => new Response(null, { headers: corsHeaders }));

// ==================== VERIFICATION ENDPOINT ====================
router.post('/api/verify', async (request) => {
  try {
    const { key } = await request.json();

    if (!key || typeof key !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid key format'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Search in keys database
    const keyData = keysDatabase.find(k => k.key === key.trim());

    if (!keyData) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Key not found'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const expiresAt = new Date(keyData.expiresAt);
    const now = new Date();
    const isExpired = expiresAt <= now;

    // Check if revoked
    if (keyData.status === 'revoked') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Key has been revoked'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if expired
    if (isExpired) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Key has expired'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate time remaining
    const timeLeft = expiresAt - now;
    const daysLeft = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
    const hoursLeft = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Key is valid',
        data: {
          key: keyData.key,
          type: keyData.type || 'free',
          user: keyData.user,
          createdAt: keyData.createdAt,
          expiresAt: keyData.expiresAt,
          status: keyData.status,
          daysLeft: daysLeft,
          hoursLeft: hoursLeft,
          timeRemaining: `${daysLeft}d ${hoursLeft}h`
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Server error',
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// ==================== GENERATE KEY ENDPOINT ====================
router.post('/api/generate-key', async (request) => {
  try {
    const { days, type, user, role } = await request.json();

    // Validate input
    if (!days || days < 1 || days > 365) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid days value' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['free', 'premium'].includes(type)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid key type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate random key
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomPart = '';
    for (let i = 0; i < 24; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const keyPrefix = type === 'free' ? 'Free' : 'Prem';
    const key = keyPrefix + randomPart;

    const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const createdDate = new Date();

    const keyData = {
      id: Date.now(),
      key: key,
      user: user || 'unknown',
      role: role || 'user',
      type: type,
      createdAt: createdDate.toISOString(),
      expiresAt: expiryDate.toISOString(),
      status: 'active'
    };

    keysDatabase.push(keyData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Key generated successfully',
        data: keyData
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Server error',
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// ==================== GET ALL KEYS ====================
router.get('/api/keys', (request) => {
  return new Response(
    JSON.stringify({
      success: true,
      data: keysDatabase
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
});

// ==================== REVOKE KEY ====================
router.post('/api/revoke-key', async (request) => {
  try {
    const { keyId } = await request.json();

    if (!keyId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Key ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const key = keysDatabase.find(k => k.id === keyId);
    if (!key) {
      return new Response(
        JSON.stringify({ success: false, message: 'Key not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    key.status = 'revoked';

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Key revoked successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Server error',
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// ==================== HEALTH CHECK ====================
router.get('/api/health', () => {
  return new Response(
    JSON.stringify({
      status: 'OK',
      timestamp: new Date().toISOString(),
      keysCount: keysDatabase.length
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
});

// ==================== SERVE FRONTEND ====================
router.get('/', async () => {
  try {
    const response = await fetch('https://raw.githubusercontent.com/justEmirz/Idk/main/index.html');
    const html = await response.text();
    
    // Update API_URL in HTML to use current domain
    const updatedHtml = html.replace(
      "const API_URL = 'http://localhost:3000';",
      `const API_URL = '${new URL(request.url).origin}';`
    );
    
    return new Response(updatedHtml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    });
  } catch (error) {
    return new Response(
      `<h1>Roblox Key Verification</h1><p>API is working! Visit your domain to manage keys.</p><pre>${error.message}</pre>`,
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
      }
    );
  }
});

// 404 handler
router.all('*', () => {
  return new Response(
    JSON.stringify({
      success: false,
      message: 'Not Found',
      available_endpoints: [
        'POST /api/verify',
        'POST /api/generate-key',
        'GET /api/keys',
        'POST /api/revoke-key',
        'GET /api/health'
      ]
    }),
    {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
});

export default router.handle;
