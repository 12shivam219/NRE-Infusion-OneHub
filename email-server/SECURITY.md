# Email Server Security Hardening Guide

## Overview
This document outlines security considerations and hardening recommendations for the email server component, particularly regarding in-memory credential storage.

## 1. In-Memory Credentials Management

### Current Architecture
- Email account credentials are loaded from encrypted environment variables at startup
- Decrypted passwords are stored in a Node.js `Map` structure: `emailAccounts`
- Passwords remain in process memory throughout the server's lifecycle
- Encryption uses AES-256-GCM with a master key

### Security Posture

**Acceptable for this scale because:**
- ✅ Credentials are encrypted at rest in environment configuration
- ✅ Access requires bypassing OS-level process isolation
- ✅ Typically deployed in managed containers with strict security boundaries
- ✅ Service-to-service communication uses API keys (Bearer tokens), not raw credentials

**Assumptions required:**
- ✅ Process runs in a restricted security context (dedicated user, limited privileges)
- ✅ Core dumps are disabled system-wide
- ✅ Regular security audits and log monitoring are in place
- ✅ Server is deployed in a private network segment or VPC

### Attack Vectors & Mitigations

| Attack Vector | Risk | Mitigation |
|---------------|------|-----------|
| Core dumps containing memory | Medium | Disable core dumps (`ulimit -c 0`) |
| Debugger attachment | Medium | Use SELinux/AppArmor to prevent debugger access |
| Memory read privileges | Low | Run process with restricted file permissions (700) |
| Privilege escalation | Low | Never run as root; use dedicated service account |
| Swap file exposure | Medium | Disable swap or encrypt it on production servers |

## 2. Production Hardening Steps

### System Level

```bash
# Disable core dumps globally
cat >> /etc/security/limits.conf << EOF
*                soft    core            0
*                hard    core            0
root             soft    core            0
root             hard    core            0
EOF

# For running process directly (systemd service)
# Add to systemd service file:
# [Service]
# LimitCORE=0
# ProtectSystem=strict
# ProtectHome=yes
# NoNewPrivileges=true
# ReadWritePaths=/var/log/email-server
```

### Node.js Process

```javascript
// In email-server/server.js - Already Implemented
// Set resource limits
import os from 'os';

if (NODE_ENV === 'production') {
  // Gracefully handle termination signals to clear credentials
  process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    
    // Clear sensitive data from memory
    for (const [email, account] of emailAccounts.entries()) {
      emailAccounts.delete(email);
    }
    
    process.exit(0);
  });
}
```

### Container/Deployment

```dockerfile
# Dockerfile best practices
FROM node:18-alpine

# Run as non-root
RUN addgroup -g 1001 emailserver && \
    adduser -u 1001 -G emailserver -s /sbin/nologin emailserver

USER emailserver

# Disable core dumps in container
RUN echo "* soft core 0" >> /etc/security/limits.conf && \
    echo "* hard core 0" >> /etc/security/limits.conf

CMD ["node", "server.js"]
```

### Environment Configuration

```bash
# .env.production (Secure Storage)
# Store this in a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)

ENCRYPTION_MASTER_KEY=<generated-secure-key>
EMAIL_ACCOUNTS=<encrypted:credentials>
API_KEY=<strong-random-key>
REDIS_URL=<secured-redis-connection>

# For development only
NODE_ENV=production
```

## 3. Monitoring & Audit Trail

### Recommended Monitoring

```javascript
// Monitor suspicious memory access patterns
// In production monitoring:
- Track process memory usage over time (should be stable)
- Alert if memory growth indicates potential memory leak
- Monitor failed authentication attempts (API_KEY validation)
- Log all campaign operations with user attribution
```

### Audit Requirements

- [ ] Weekly: Review API access logs for unauthorized requests
- [ ] Monthly: Verify credential rotation status
- [ ] Quarterly: Security audit of memory protection mechanisms
- [ ] On-demand: Investigate any core dump files (should not exist)

## 4. Credential Rotation Strategy

### Current Limitation
- Credentials are loaded at server startup only
- To rotate credentials, server requires restart

### Recommended Implementation (Future)

```javascript
// Future enhancement: Hot credential rotation
async function rotateCredentials() {
  // 1. Load new credentials from secrets manager
  // 2. Create new transporters with updated auth
  // 3. Gracefully drain existing email queue
  // 4. Switch to new transporters
  // 5. Remove old transporters from memory
}

// Call this periodically or via admin endpoint
setInterval(rotateCredentials, 30 * 24 * 60 * 60 * 1000); // Every 30 days
```

## 5. RLS Policy Verification

### bulk_email_campaign_status Table

The table now includes proper RLS policies (via migration 024):
- ❌ Anon users: BLOCKED (no access)
- ✅ Authenticated users: Can read own campaigns only
- ✅ Service role: Full access for backend operations

```sql
-- Verified policies:
SELECT * FROM pg_policies 
WHERE tablename = 'bulk_email_campaign_status';
```

## 6. Incident Response

### If You Suspect Credential Compromise

1. **Immediate Actions**
   ```bash
   # Stop the email server
   systemctl stop email-server
   
   # Kill any lingering Node processes
   pkill -9 node
   
   # Rotate compromised credentials
   # Update in secrets manager
   ```

2. **Investigation**
   ```bash
   # Check for core dumps
   find / -name core -type f 2>/dev/null
   
   # Review process memory was protected
   cat /proc/[pid]/status | grep Core
   
   # Check logs for unusual access
   grep -i "error\|failed\|denied" /var/log/email-server/
   ```

3. **Recovery**
   - Revoke compromised credentials immediately
   - Generate new `ENCRYPTION_MASTER_KEY`
   - Restart with new encrypted credentials
   - Audit all email campaigns for suspicious activity

## 7. Testing & Validation

### Security Testing Checklist

```bash
# 1. Verify core dumps are disabled
ulimit -c
# Should output: 0

# 2. Verify process permissions
ps aux | grep "node.*server.js"
# Should show restricted user, NOT root

# 3. Verify encryption key is set
grep "ENCRYPTION_MASTER_KEY" .env
# Should contain a non-empty value

# 4. Test RLS policies
# See: supabase/migrations/024_harden_campaign_status_rls.sql

# 5. Verify API authentication
curl -X GET http://localhost:3001/api/campaigns
# Should return 401 Unauthorized (no Bearer token)
```

## 8. References

- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [CIS Docker Benchmark](https://www.cisecurity.org/cis-benchmarks/)

## Contact & Support

For security concerns or questions:
1. Review this document
2. Check SECURITY_FIXES.md for deployment checklist
3. Run the security testing checklist above
4. Contact security team if issues persist
