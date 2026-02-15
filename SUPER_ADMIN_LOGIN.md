# 🔐 Super Admin Login Guide

## Overview

The KidTrackerApp™ now has a simplified login screen that serves both **Daycare Staff** and **GDI Super Administrators**. The GDI Admin toggle has been removed from the login screen for a cleaner user experience.

## ✅ Setup Complete!

The database has been configured and the super admin user is ready to use. You can login immediately!

---

## 🎯 How It Works

### For Daycare Staff
Daycare staff login normally with:
- **Daycare Code** - 6-character code provided by their daycare
- **Username** - Their assigned username
- **Password** - Their password

### For Super Admin (GDI Digital Solutions)
Super Admin can login **without** a daycare code by using special credentials:
- **Daycare Code** - Leave empty or enter any value (will be ignored)
- **Username** - `superadmin`
- **Password** - `admin123`

---

## 🔑 Super Admin Credentials

### Default Super Admin Account

```
Username: superadmin
Password: admin123
Role: super_admin
```

**Note:** The system will automatically detect super admin credentials and bypass the daycare code requirement, taking you directly to the Super Admin Dashboard.

### Alternative Super Admin Login

If a super admin account has been created with an email address, you can also login with:
```
Username: [email address]
Password: [password]
```

---

## 🚀 Login Instructions

### For Super Admin:

1. **Open KidTrackerApp™** - The login screen appears
2. **Daycare Code** - You can leave this blank or enter anything (it will be ignored for super admin)
3. **Username** - Enter `superadmin`
4. **Password** - Enter `admin123`
5. **Click "Sign In"** - You'll be authenticated as Super Admin
6. ✅ **Super Admin Dashboard** - You'll see the dashboard with all daycares

### For Daycare Staff:

1. **Open KidTrackerApp™** - The login screen appears
2. **Daycare Code** - Enter your 6-character daycare code (e.g., `ABC123`)
3. **Username** - Enter your assigned username
4. **Password** - Enter your password
5. **Click "Sign In"** - You'll be authenticated to your daycare
6. ✅ **Daycare Dashboard** - You'll see your daycare's dashboard

---

## 🔐 Security Notes

### Production Deployment
Before deploying to production, you should:

1. **Change the default super admin password:**
   - Login as super admin
   - Go to Manage Users
   - Find the super admin account
   - Update the password to a strong, unique password

2. **Create individual super admin accounts:**
   - Don't share the super admin credentials
   - Create separate accounts for each GDI administrator
   - Use the Manage Users feature to create additional super_admin role accounts

3. **Secure the credentials:**
   - Store credentials in a secure password manager
   - Use strong, unique passwords
   - Enable two-factor authentication (when available)

---

## 🎨 What You'll See

### Login Screen (Simplified)
- **KidTrackerApp™ branding** with blue color scheme
- **Daycare Code field** - For daycare staff (super admin can skip)
- **Username field** - For all users
- **Password field** - For all users with show/hide toggle
- **Sign In button** - To authenticate

### After Super Admin Login
- **Super Admin Dashboard** - View and manage all daycares
- **Header shows** - Your name and "Super Admin" badge
- **Access to:**
  - View all daycares
  - Create new daycares
  - Manage daycare subscriptions
  - View trial status
  - Access any daycare's dashboard
  - Manage users across all daycares

### After Daycare Login
- **Daycare Dashboard** - Your specific daycare's features
- **Header shows** - Daycare name and your role badge
- **Access to:**
  - Dashboard
  - Children Management
  - Attendance
  - Activities
  - Classrooms
  - Financials
  - Invoicing
  - Reports
  - Meal Menu
  - QuickBooks Integration
  - Manage Users (if admin)
  - Company Info

---

## 🛠️ Troubleshooting

### Super Admin Login Issues

**Problem:** "Invalid credentials" error
**Solutions:**
- ✅ Verify username is exactly `superadmin` (lowercase, no spaces)
- ✅ Verify password is exactly `admin123`
- ✅ Check that the super admin account exists in the database
- ✅ Ensure the account status is "active"

**Problem:** Logged in but don't see Super Admin Dashboard
**Solutions:**
- ✅ Verify the user role is `super_admin` (not just `admin`)
- ✅ Check that you didn't accidentally enter a daycare code
- ✅ Try logging out and logging in again

**Problem:** Need to create a super admin account
**Solutions:**
- Use the `create-superadmin.cjs` script in the project root
- Or manually insert into the database with role='super_admin'
- Or have an existing super admin create the account

---

## 📊 User Roles Comparison

| Feature | Super Admin | Daycare Admin | Daycare User |
|---------|-------------|---------------|--------------|
| Access All Daycares | ✅ | ❌ | ❌ |
| Create Daycares | ✅ | ❌ | ❌ |
| Manage Subscriptions | ✅ | ❌ | ❌ |
| View Trial Status | ✅ | ✅ | ❌ |
| Daycare Code Required | ❌ | ✅ | ✅ |
| Manage Daycare Users | ✅ | ✅ | ❌ |
| Access Daycare Features | ✅ | ✅ | ✅ |

---

## ✅ Quick Reference

### Login Scenarios

**Scenario 1: GDI Administrator**
```
Daycare Code: [blank or anything]
Username: superadmin
Password: admin123
→ Goes to: Super Admin Dashboard
```

**Scenario 2: Daycare Administrator**
```
Daycare Code: ABC123
Username: admin_abc123
Password: Password123!
→ Goes to: ABC Daycare Dashboard (with Manage Users access)
```

**Scenario 3: Daycare Staff**
```
Daycare Code: ABC123
Username: jsmith
Password: staffpass
→ Goes to: ABC Daycare Dashboard (limited access)
```

---

## 📝 Notes

- The login system automatically detects super admin credentials
- Super admin login **does not require** a daycare code (it's optional)
- Regular daycare users **must** provide a valid daycare code
- The system checks for super admin first before validating daycare codes
- All passwords are case-sensitive
- Usernames can be entered in any case (converted to lowercase automatically)

---

## 🎉 Summary

✅ **Simplified Login** - One login screen for everyone
✅ **Automatic Detection** - System automatically identifies super admin
✅ **Secure Access** - Role-based permissions enforced
✅ **No Toggle Needed** - Cleaner user interface
✅ **Backwards Compatible** - Existing daycare logins work unchanged

**Super Admin can now login seamlessly using the standard login screen!**

---

**Powered by GDI Digital Solutions** 🚀
