# STEP 01: Password Security Concepts

**Goal**: Understand why we hash passwords and how bcrypt works

## Why Never Store Plaintext Passwords?

### The Security Problem

Imagine your database gets compromised (hacked, stolen, leaked). If passwords are stored in plaintext:

```
users table:
email: user@example.com
password: mypassword123  ← ❌ Anyone can see it!
```

**What happens**:
- Attacker can log in as any user
- Users often reuse passwords (same password for email, bank, etc.)
- Complete account takeover
- Legal liability for your company

### Real-World Example

In 2012, LinkedIn was hacked. **6.5 million passwords** were stolen. They were stored in **plaintext**. The attackers could log in as any user.

**Result**: Massive data breach, lawsuits, reputation damage.

### The Solution: Password Hashing

Instead of storing the password, we store a **hash**:

```
Original password: mypassword123
Hashed version: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```

**What's a hash?**
- One-way function: Can't reverse it to get original password
- Same input = same output (deterministic)
- Small change in input = completely different output

**Example**:
```
hash("password") = abc123...
hash("password1") = xyz789...  ← Completely different!
```

## How bcrypt Works

### What is bcrypt?

bcrypt is a password hashing function designed to be:
- **Slow**: Takes time to compute (prevents brute force attacks)
- **Adaptive**: Can increase difficulty over time
- **Salted**: Adds random data to prevent rainbow table attacks

### The Hashing Process

When you hash a password with bcrypt:

1. **Generate Salt**: Random data unique to each password
2. **Combine**: Password + Salt
3. **Hash**: Run through bcrypt algorithm (multiple rounds)
4. **Store**: Hash + Salt together

**Visual**:
```
Password: "mypassword123"
    ↓
Generate Salt: "randomSalt123"
    ↓
Combine: "mypassword123" + "randomSalt123"
    ↓
Hash (10 rounds): "$2a$10$N9qo8uLOickgx2ZMRZoMye..."
    ↓
Store in database
```

### Why Salting Matters

**Without Salt**:
```
Password: "password123"
Hash: abc123... (same for everyone with this password)
```

**Problem**: If two users have the same password, they have the same hash. Attacker can see this pattern.

**With Salt**:
```
User 1: Password "password123" + Salt "xyz" = Hash "abc123..."
User 2: Password "password123" + Salt "def" = Hash "xyz789..."
```

**Benefit**: Even same passwords produce different hashes!

### Rounds (Cost Factor)

bcrypt uses "rounds" to control how slow hashing is:

```typescript
bcrypt.hash(password, 10)  // 10 rounds
```

**What rounds mean**:
- More rounds = slower hashing = more secure
- But also slower for legitimate users
- Balance: 10 rounds is standard (good security, acceptable speed)

**Why slow is good?**
- Attacker tries millions of passwords per second
- Slow hashing = attacker can only try thousands per second
- Makes brute force attacks impractical

**Example**:
- Fast hash: 1 million attempts/second
- bcrypt (10 rounds): 100 attempts/second
- **10,000x slower** = much harder to crack!

## Password Comparison

### How We Verify Passwords

When user logs in:

1. User enters password: `"mypassword123"`
2. We get stored hash from database: `"$2a$10$N9qo8uLOickgx2ZMRZoMye..."`
3. bcrypt extracts salt from stored hash
4. Hash the entered password with same salt
5. Compare: If hashes match, password is correct!

**Code example** (we'll implement this next):
```typescript
const isValid = await bcrypt.compare(enteredPassword, storedHash);
// Returns true if password matches, false otherwise
```

**Why this works**:
- bcrypt stores salt in the hash itself
- `compare()` extracts salt and hashes entered password
- Compares the two hashes

## Security Best Practices

### 1. Never Store Plaintext
✅ Hash passwords before storing
❌ Never store original password

### 2. Use Strong Hashing
✅ Use bcrypt (or Argon2, scrypt)
❌ Don't use MD5, SHA1 (too fast, broken)

### 3. Appropriate Rounds
✅ 10 rounds (good balance)
❌ Too few rounds (weak) or too many (slow for users)

### 4. Never Log Passwords
✅ Log "password attempt failed" (no password in log)
❌ Never log the actual password

### 5. Validate Password Strength
✅ Require minimum length, complexity
❌ Allow weak passwords like "123456"

## Common Attacks

### 1. Brute Force
**Attack**: Try every possible password
**Defense**: Slow hashing (bcrypt), rate limiting

### 2. Rainbow Tables
**Attack**: Pre-computed hash tables
**Defense**: Salting (each password has unique salt)

### 3. Dictionary Attack
**Attack**: Try common passwords
**Defense**: Require strong passwords, rate limiting

### 4. Credential Stuffing
**Attack**: Use passwords from other breaches
**Defense**: Educate users, require password changes

## Key Takeaways

1. **Never store plaintext passwords** - Always hash them
2. **bcrypt is designed for passwords** - Slow, salted, adaptive
3. **Salting prevents rainbow tables** - Each password gets unique salt
4. **Rounds control security** - More rounds = more secure but slower
5. **Comparison is secure** - bcrypt handles salt extraction automatically

## What's Next?

✅ **You understand**: Why we hash passwords and how bcrypt works

➡️ **Next step**: [STEP-02-bcrypt-setup.md](./STEP-02-bcrypt-setup.md) - Install and configure bcrypt

## Questions to Test Understanding

1. Why can't we reverse a hash to get the original password?
2. What is a salt and why do we need it?
3. Why is slow hashing actually good for security?
4. How does bcrypt.compare() verify a password?

---

**Ready?** Let's implement bcrypt in the next step!
