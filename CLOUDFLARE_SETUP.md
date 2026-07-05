# 🚀 CloudFlare Workers Setup Guide

## ✨ Keuntungan CloudFlare Workers

✅ **FREE** - 100,000 requests/day gratis  
✅ **Unlimited** - Setelah quota gratis, hanya $0.15/million requests  
✅ **Super Cepat** - Global edge network  
✅ **CORS Built-in** - Bisa langsung diakses dari Roblox  
✅ **Serverless** - Tidak perlu maintain server  

---

## 📋 Setup Steps

### Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

### Step 2: Login ke CloudFlare

```bash
wrangler login
```

Ini akan membuka browser untuk authenticate dengan CloudFlare account.

### Step 3: Deploy Worker

```bash
wrangler deploy
```

Wrangler akan:
- Membaca `wrangler.toml`
- Deploy `worker.js` ke CloudFlare
- Memberikan URL publik

### Step 4: Dapatkan URL Publik

Setelah deploy berhasil, Anda akan dapat URL seperti:
```
https://roblox-key-verification.justEmirz.workers.dev
```

---

## 🎮 Gunakan di Roblox Script

### Contoh Script Roblox:

```lua
local HttpService = game:GetService("HttpService")
local API_URL = "https://roblox-key-verification.justEmirz.workers.dev" -- GANTI INI!

local function verifyKey(key)
    local success, response = pcall(function()
        return HttpService:PostAsync(
            API_URL .. "/api/verify",
            HttpService:JSONEncode({key = key}),
            Enum.HttpContentType.ApplicationJson
        )
    end)
    
    if success then
        return HttpService:JSONDecode(response)
    else
        return {
            success = false,
            message = "Network error: " .. response
        }
    end
end

-- Usage
local result = verifyKey("FreeAbcd1234...")

if result.success then
    print("✅ Key Valid!")
    print("Type: " .. result.data.type)
    print("Expires: " .. result.data.timeRemaining)
else
    print("❌ " .. result.message)
end
```

---

## 🔧 Debugging

### View Logs

```bash
wrangler tail
```

Ini akan show real-time logs dari Worker Anda.

### Test API

```bash
# Test verify endpoint
curl -X POST https://your-worker-url.workers.dev/api/verify \
  -H "Content-Type: application/json" \
  -d '{"key": "FreeAbcd1234..."}'

# Test health check
curl https://your-worker-url.workers.dev/api/health
```

---

## ⚠️ Limitations

**⚠️ PENTING:** CloudFlare Workers memiliki keterbatasan:

1. **Memory Terbatas** - ~128MB RAM
   - Data hanya tersimpan di memory, hilang saat Worker restart
   - Untuk production, gunakan CloudFlare KV atau database eksternal

2. **Timeout** - Max 30 detik per request
   - Untuk operasi berat, gunakan background processing

3. **No Persistent Storage** - Data tidak tersimpan
   - Gunakan KV Store atau connect ke database

---

## 💾 Upgrade dengan Persistent Storage

Jika Anda butuh menyimpan data permanent, upgrade ke:

### Option A: CloudFlare KV (Recommended)

Edit `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "KEYS"
id = "your-kv-namespace-id"
```

Gunakan di `worker.js`:
```javascript
await KEYS.put(keyData.key, JSON.stringify(keyData));
const stored = await KEYS.get(keyData.key);
```

### Option B: External Database

Connect ke database seperti:
- **Supabase** (PostgreSQL)
- **MongoDB Atlas** (MongoDB)
- **Firebase** (NoSQL)

---

## 🔑 Update URL di Frontend

Edit `index.html` line 855:

```javascript
const API_URL = 'https://your-worker-url.workers.dev';
```

Ganti dengan URL CloudFlare Workers Anda.

---

## 📊 Monitor Usage

1. Buka https://dash.cloudflare.com
2. Pilih account Anda
3. Buka "Workers & Pages"
4. Klik worker Anda
5. Tab "Analytics" untuk melihat:
   - Request count
   - Error rate
   - Response time
   - Bandwidth usage

---

## 💰 Pricing

| Plan | Requests/day | Price/bulan |
|------|-------------|-------------|
| Free | 100,000 | $0 |
| Pro | Unlimited | $5 + usage |

Usage: $0.15/million requests  
KV Storage: $0.50/month + $0.20/million operations

**Example:** 1 juta requests/hari = ~$4.50/bulan

---

## ✅ Testing Checklist

- [ ] Deploy worker berhasil
- [ ] Bisa akses `/api/health`
- [ ] Generate key dari dashboard
- [ ] Verify key dari Roblox script
- [ ] Check CloudFlare analytics
- [ ] Monitor logs dengan `wrangler tail`

---

## 🆘 Troubleshooting

### "Worker error: missing binding"
- Pastikan konfigurasi `wrangler.toml` benar
- Deploy ulang: `wrangler deploy`

### "CORS error from Roblox"
- Server sudah include CORS headers
- Check CloudFlare settings tidak block request

### "Data hilang setelah restart"
- Ini normal untuk free tier
- Upgrade ke KV Store untuk persistent storage

### "Rate limited"
- Free tier: 100,000 requests/day
- Jika lewat, tunggu reset atau upgrade plan

---

## 🎓 Resources

- [CloudFlare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Guide](https://developers.cloudflare.com/workers/wrangler/)
- [KV Storage Guide](https://developers.cloudflare.com/workers/runtime-apis/kv/)

---

**Deploy sekarang dan mulai gunakan dari Roblox! 🚀**
