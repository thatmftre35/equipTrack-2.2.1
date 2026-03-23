import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Create Supabase client
const getSupabaseClient = () => createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Organization-Id"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-927e49ee/health", (c) => {
  return c.json({ status: "ok" });
});

// Verify user endpoint
app.post("/make-server-927e49ee/verify-user", async (c) => {
  try {
    const body = await c.req.json();
    const { username, organizationCode } = body;

    if (!username || !organizationCode) {
      return c.json({ error: "Username and organization code are required" }, 400);
    }

    const userKey = `user:${username}`;
    const userData = await kv.get(userKey);

    if (!userData) {
      return c.json({ error: "User not found or not approved" }, 404);
    }

    // Verify organization code matches (case-insensitive)
    const orgKey = `org:${userData.organizationId}`;
    const orgData = await kv.get(orgKey);

    if (!orgData) {
      return c.json({ error: "Organization not found" }, 404);
    }

    if (!orgData.organizationCode) {
      return c.json({ error: "Organization code not set. Please contact your administrator." }, 500);
    }

    if (orgData.organizationCode.toUpperCase() !== organizationCode.toUpperCase()) {
      return c.json({ error: "Invalid organization code" }, 401);
    }

    return c.json({ 
      organizationId: userData.organizationId,
      organizationName: orgData.name || 'Unknown Organization'
    });
  } catch (error: any) {
    console.error(`Error verifying user: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Verify organization admin endpoint
app.post("/make-server-927e49ee/verify-org-admin", async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;

    // Get all organizations and find matching username
    const orgs = await kv.getByPrefix("org:");
    const matchingOrg = orgs.find((org: any) => org.username === username);

    if (!matchingOrg || matchingOrg.password !== password) {
      return c.json({ error: "Invalid organization admin credentials" }, 401);
    }

    return c.json({ 
      organizationId: matchingOrg.id,
      organizationName: matchingOrg.name 
    });
  } catch (error: any) {
    console.error(`Error verifying org admin: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Get all users (admin only)
app.get("/make-server-927e49ee/users", async (c) => {
  try {
    const users = await kv.getByPrefix("user:");
    return c.json({ users: users || [] });
  } catch (error: any) {
    console.error(`Error fetching users: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Add user endpoint
app.post("/make-server-927e49ee/add-user", async (c) => {
  try {
    const body = await c.req.json();
    const { username, organizationId } = body;

    if (!username || !organizationId) {
      return c.json({ error: "Username and organizationId are required" }, 400);
    }

    const userKey = `user:${username}`;
    const existingUser = await kv.get(userKey);

    if (existingUser) {
      return c.json({ error: "User already exists" }, 400);
    }

    await kv.set(userKey, {
      username,
      organizationId,
      addedAt: new Date().toISOString(),
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error(`Error adding user: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Delete user endpoint
app.post("/make-server-927e49ee/delete-user", async (c) => {
  try {
    const body = await c.req.json();
    const { username } = body;

    if (!username) {
      return c.json({ error: "Username is required" }, 400);
    }

    const userKey = `user:${username}`;
    await kv.del(userKey);

    return c.json({ success: true });
  } catch (error: any) {
    console.error(`Error deleting user: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Get all organizations endpoint
app.get("/make-server-927e49ee/organizations", async (c) => {
  try {
    const orgsData = await kv.getByPrefix('org:');
    
    const organizations = await Promise.all(
      orgsData.map(async (org: any) => {
        // Count users for this organization
        const usersData = await kv.getByPrefix('user:');
        const userCount = usersData.filter((u: any) => u.organizationId === org.id).length;
        
        return {
          id: org.id,
          name: org.name,
          username: org.username,
          password: org.password,
          organizationCode: org.organizationCode,
          destinationEmails: org.destinationEmails,
          createdAt: org.createdAt,
          userCount,
        };
      })
    );

    return c.json({ organizations });
  } catch (error: any) {
    console.error(`Error fetching organizations: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Add organization endpoint
app.post("/make-server-927e49ee/add-organization", async (c) => {
  try {
    const body = await c.req.json();
    const { organizationId, organizationName, username, password, organizationCode, destinationEmails, approvedUsers } = body;

    if (!organizationId || !organizationName || !username || !password || !organizationCode) {
      return c.json({ error: "Organization ID, name, username, password, and organization code are required" }, 400);
    }

    // Validate organization code is 3 letters
    if (!/^[A-Za-z]{3}$/.test(organizationCode)) {
      return c.json({ error: "Organization code must be exactly 3 letters" }, 400);
    }

    const orgKey = `org:${organizationId}`;
    const existingOrg = await kv.get(orgKey);

    if (existingOrg) {
      return c.json({ error: "Organization already exists" }, 400);
    }

    await kv.set(orgKey, {
      id: organizationId,
      name: organizationName,
      username,
      password,
      organizationCode: organizationCode.toUpperCase(),
      destinationEmails: destinationEmails || [],
      createdAt: new Date().toISOString(),
    });

    // Add approved users if provided
    if (approvedUsers && Array.isArray(approvedUsers) && approvedUsers.length > 0) {
      for (const username of approvedUsers) {
        if (username) {
          const userKey = `user:${username}`;
          const existingUser = await kv.get(userKey);
          
          // Only add if user doesn't exist
          if (!existingUser) {
            await kv.set(userKey, {
              username,
              organizationId,
              addedAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error(`Error adding organization: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Update organization endpoint
app.post("/make-server-927e49ee/update-organization", async (c) => {
  try {
    const body = await c.req.json();
    const { organizationId, organizationName, username, password, organizationCode, destinationEmails, approvedUsers } = body;

    if (!organizationId || !organizationName || !username || !password || !organizationCode) {
      return c.json({ error: "Organization ID, name, username, password, and organization code are required" }, 400);
    }

    // Validate organization code is 3 letters
    if (!/^[A-Za-z]{3}$/.test(organizationCode)) {
      return c.json({ error: "Organization code must be exactly 3 letters" }, 400);
    }

    const orgKey = `org:${organizationId}`;
    const existingOrg = await kv.get(orgKey);

    if (!existingOrg) {
      return c.json({ error: "Organization not found" }, 404);
    }

    await kv.set(orgKey, {
      id: organizationId,
      name: organizationName,
      username,
      password,
      organizationCode: organizationCode.toUpperCase(),
      destinationEmails: destinationEmails || [],
      createdAt: existingOrg.createdAt,
      updatedAt: new Date().toISOString(),
    });

    // Handle approved users if provided
    if (approvedUsers && approvedUsers.length > 0) {
      for (const username of approvedUsers) {
        const userKey = `user:${username}`;
        await kv.set(userKey, {
          username,
          organizationId,
          approvedAt: new Date().toISOString(),
        });
      }
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error(`Error updating organization: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Delete organization endpoint
app.post("/make-server-927e49ee/delete-organization", async (c) => {
  try {
    const body = await c.req.json();
    const { organizationId } = body;

    if (!organizationId) {
      return c.json({ error: "Organization ID is required" }, 400);
    }

    // Delete the organization
    const orgKey = `org:${organizationId}`;
    await kv.del(orgKey);

    // Delete all users associated with this organization
    const usersData = await kv.getByPrefix('user:');
    const orgUsers = usersData.filter((u: any) => u.organizationId === organizationId);
    
    for (const user of orgUsers) {
      await kv.del(`user:${user.username}`);
    }

    // Delete all organization data (projects, equipment types, etc.)
    const prefixes = [
      `projects:${organizationId}`,
      `equipment_types:${organizationId}`,
      `equipment_models:${organizationId}`,
    ];

    for (const prefix of prefixes) {
      await kv.del(prefix);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error(`Error deleting organization: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Get organization settings
app.get("/make-server-927e49ee/organization-settings", async (c) => {
  try {
    const organizationId = c.req.header('X-Organization-Id');
    
    if (!organizationId) {
      return c.json({ error: "Organization ID is required" }, 400);
    }

    const orgKey = `org:${organizationId}`;
    const org = await kv.get(orgKey);

    if (!org) {
      return c.json({ error: "Organization not found" }, 404);
    }

    return c.json({
      organizationName: org.name,
      approvalEmails: org.approvalEmails || org.destinationEmails || [],
      finalEmails: org.finalEmails || org.destinationEmails || [],
    });
  } catch (error: any) {
    console.error(`Error fetching organization settings: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Update organization settings
app.post("/make-server-927e49ee/update-organization-settings", async (c) => {
  try {
    const body = await c.req.json();
    const { organizationId, approvalEmails, finalEmails } = body;

    if (!organizationId) {
      return c.json({ error: "Organization ID is required" }, 400);
    }

    const orgKey = `org:${organizationId}`;
    const existingOrg = await kv.get(orgKey);

    if (!existingOrg) {
      return c.json({ error: "Organization not found" }, 404);
    }

    await kv.set(orgKey, {
      ...existingOrg,
      approvalEmails: approvalEmails || existingOrg.approvalEmails || [],
      finalEmails: finalEmails || existingOrg.finalEmails || [],
      // Keep destinationEmails for backward compatibility
      destinationEmails: finalEmails || existingOrg.destinationEmails || [],
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error(`Error updating organization settings: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Submit call off form
app.post("/make-server-927e49ee/submit-calloff", async (c) => {
  try {
    const body = await c.req.json();
    console.log('Received call off request body:', JSON.stringify(body, null, 2));
    const { name, project, equipmentType, model, callOffDate, notes = '' } = body;
    
    // Get organization ID from header
    const organizationId = c.req.header('X-Organization-Id');
    
    if (!organizationId) {
      return c.json({ error: "Organization ID is required" }, 400);
    }
    
    // Get organization to retrieve approval emails
    const orgKey = `org:${organizationId}`;
    const org = await kv.get(orgKey);
    
    if (!org) {
      return c.json({ error: "Organization not found" }, 404);
    }

    const approvalEmails = org.approvalEmails || org.destinationEmails || [];
    
    if (approvalEmails.length === 0) {
      return c.json({ error: "No approval emails configured. Please contact your organization administrator to set up email settings." }, 400);
    }
    
    // Create unique request ID
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Save to pending requests
    const requestsKey = `pending-requests:${organizationId}`;
    const existingRequests = await kv.get(requestsKey) || [];
    
    const newRequest = {
      id: requestId,
      type: 'calloff',
      submittedBy: name,
      submittedAt: new Date().toISOString(),
      data: { name, project, equipmentType, model, callOffDate, notes }
    };
    
    await kv.set(requestsKey, [...existingRequests, newRequest]);
    
    // Send simple notification email to approval emails
    const emailResult = await sendEmail(
      approvalEmails.join(', '),
      "🔔 New Equipment Request Pending Approval",
      `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; color: white; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; margin: 15px 0; padding: 20px; border-radius: 5px; border-left: 4px solid #667eea; }
            .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Equipment Request</h1>
            </div>
            <div class="content">
              <div class="info-box">
                <p><strong>Type:</strong> Call Off Request</p>
                <p><strong>Submitted By:</strong> ${name}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <p style="font-size: 16px; margin: 20px 0;">
                A new equipment request has been submitted and is awaiting your approval.
              </p>
              <p style="font-size: 14px; color: #666;">
                Please log in to your organization admin portal to review and approve or deny this request.
              </p>
            </div>
            <div class="footer">
              <p>This is an automated message from EquipTrack</p>
            </div>
          </div>
        </body>
        </html>
      `
    );

    if (!emailResult.success) {
      console.error(`Error sending notification email: ${emailResult.error}`);
      return c.json({ error: `Failed to send notification email: ${emailResult.error}` }, 500);
    }

    return c.json({ success: true, message: "Call off submitted and pending approval" });
  } catch (error) {
    console.error(`Error in submit-calloff endpoint: ${error}`);
    return c.json({ error: `Server error while submitting call off: ${error.message}` }, 500);
  }
});

// Submit rental request form
app.post("/make-server-927e49ee/submit-rental", async (c) => {
  try {
    const body = await c.req.json();
    console.log('Received rental request body:', JSON.stringify(body, null, 2));
    const { name, project, equipmentType, model, requiredByDate, expectedReturnDate, notes = '' } = body;
    
    // Get organization ID from header
    const organizationId = c.req.header('X-Organization-Id');
    
    if (!organizationId) {
      return c.json({ error: "Organization ID is required" }, 400);
    }
    
    // Get organization to retrieve approval emails
    const orgKey = `org:${organizationId}`;
    const org = await kv.get(orgKey);
    
    if (!org) {
      return c.json({ error: "Organization not found" }, 404);
    }

    const approvalEmails = org.approvalEmails || org.destinationEmails || [];
    
    if (approvalEmails.length === 0) {
      return c.json({ error: "No approval emails configured. Please contact your organization administrator to set up email settings." }, 400);
    }
    
    // Create unique request ID
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Save to pending requests
    const requestsKey = `pending-requests:${organizationId}`;
    const existingRequests = await kv.get(requestsKey) || [];
    
    const newRequest = {
      id: requestId,
      type: 'rental',
      submittedBy: name,
      submittedAt: new Date().toISOString(),
      data: { name, project, equipmentType, model, requiredByDate, expectedReturnDate, notes }
    };
    
    await kv.set(requestsKey, [...existingRequests, newRequest]);
    
    // Send simple notification email to approval emails
    const emailResult = await sendEmail(
      approvalEmails.join(', '),
      "🔔 New Equipment Request Pending Approval",
      `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; color: white; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; margin: 15px 0; padding: 20px; border-radius: 5px; border-left: 4px solid #10b981; }
            .cta-button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Equipment Request</h1>
            </div>
            <div class="content">
              <div class="info-box">
                <p><strong>Type:</strong> Rental Request</p>
                <p><strong>Submitted By:</strong> ${name}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <p style="font-size: 16px; margin: 20px 0;">
                A new equipment request has been submitted and is awaiting your approval.
              </p>
              <p style="font-size: 14px; color: #666;">
                Please log in to your organization admin portal to review and approve or deny this request.
              </p>
            </div>
            <div class="footer">
              <p>This is an automated message from EquipTrack</p>
            </div>
          </div>
        </body>
        </html>
      `
    );

    if (!emailResult.success) {
      console.error(`Error sending notification email: ${emailResult.error}`);
      return c.json({ error: `Failed to send notification email: ${emailResult.error}` }, 500);
    }

    return c.json({ success: true, message: "Rental request submitted and pending approval" });
  } catch (error) {
    console.error(`Error in submit-rental endpoint: ${error}`);
    return c.json({ error: `Server error while submitting rental request: ${error.message}` }, 500);
  }
});

// Submit owned equipment request form
app.post("/make-server-927e49ee/submit-owned", async (c) => {
  try {
    const body = await c.req.json();
    console.log('Received owned equipment request body:', JSON.stringify(body, null, 2));
    const { name, project, equipment, notes = '' } = body;
    
    // Get organization ID from header
    const organizationId = c.req.header('X-Organization-Id');
    
    if (!organizationId) {
      return c.json({ error: "Organization ID is required" }, 400);
    }
    
    // Get organization to retrieve approval emails
    const orgKey = `org:${organizationId}`;
    const org = await kv.get(orgKey);
    
    if (!org) {
      return c.json({ error: "Organization not found" }, 404);
    }

    const approvalEmails = org.approvalEmails || org.destinationEmails || [];
    
    if (approvalEmails.length === 0) {
      return c.json({ error: "No approval emails configured. Please contact your organization administrator to set up email settings." }, 400);
    }
    
    // Create unique request ID
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Save to pending requests
    const requestsKey = `pending-requests:${organizationId}`;
    const existingRequests = await kv.get(requestsKey) || [];
    
    const newRequest = {
      id: requestId,
      type: 'owned',
      submittedBy: name,
      submittedAt: new Date().toISOString(),
      data: { name, project, equipment, notes }
    };
    
    await kv.set(requestsKey, [...existingRequests, newRequest]);
    
    // Send simple notification email to approval emails
    const emailResult = await sendEmail(
      approvalEmails.join(', '),
      "🔔 New Equipment Request Pending Approval",
      `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; color: white; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; margin: 15px 0; padding: 20px; border-radius: 5px; border-left: 4px solid #f59e0b; }
            .cta-button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Equipment Request</h1>
            </div>
            <div class="content">
              <div class="info-box">
                <p><strong>Type:</strong> Owned Equipment Request</p>
                <p><strong>Submitted By:</strong> ${name}</p>
                <p><strong>Items:</strong> ${equipment.length} piece(s)</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <p style="font-size: 16px; margin: 20px 0;">
                A new equipment request has been submitted and is awaiting your approval.
              </p>
              <p style="font-size: 14px; color: #666;">
                Please log in to your organization admin portal to review and approve or deny this request.
              </p>
            </div>
            <div class="footer">
              <p>This is an automated message from EquipTrack</p>
            </div>
          </div>
        </body>
        </html>
      `
    );

    if (!emailResult.success) {
      console.error(`Error sending notification email: ${emailResult.error}`);
      return c.json({ error: `Failed to send notification email: ${emailResult.error}` }, 500);
    }

    return c.json({ success: true, message: "Owned equipment request submitted and pending approval" });
  } catch (error) {
    console.error(`Error in submit-owned endpoint: ${error}`);
    return c.json({ error: `Server error while submitting owned equipment request: ${error.message}` }, 500);
  }
});

// Get projects - USING KV STORE LIKE OTHER DATA
app.get("/make-server-927e49ee/projects", async (c) => {
  try {
    const organizationId = c.req.header("X-Organization-Id");
    console.log('GET /projects - organizationId:', organizationId);
    if (!organizationId) {
      return c.json({ error: "Organization ID required" }, 400);
    }
    
    const key = `projects:${organizationId}`;
    console.log('GET /projects - fetching with key:', key);
    
    const projects = await kv.get(key);
    console.log('GET /projects - retrieved:', projects);
    
    return c.json({ projects: projects || [] });
  } catch (error) {
    console.error(`Error fetching projects: ${error}`);
    return c.json({ error: `Failed to fetch projects: ${error.message}` }, 500);
  }
});

// Save projects - USING KV STORE LIKE OTHER DATA
app.post("/make-server-927e49ee/projects", async (c) => {
  try {
    const { projects } = await c.req.json();
    const organizationId = c.req.header("X-Organization-Id");
    console.log('POST /projects - organizationId:', organizationId);
    console.log('POST /projects - projects to save:', JSON.stringify(projects));
    
    if (!organizationId) {
      return c.json({ error: "Organization ID required" }, 400);
    }
    
    const key = `projects:${organizationId}`;
    console.log('POST /projects - saving with key:', key);
    
    // Save using KV store - same as users and orgs
    await kv.set(key, projects);
    console.log('POST /projects - save complete');
    
    // Verify
    const saved = await kv.get(key);
    console.log('POST /projects - verified saved data:', saved);
    
    return c.json({ success: true, savedProjects: saved });
  } catch (error) {
    console.error(`Error saving projects: ${error}`);
    return c.json({ error: `Failed to save projects: ${error.message}` }, 500);
  }
});

// Get equipment - USING KV STORE LIKE OTHER DATA
app.get("/make-server-927e49ee/equipment", async (c) => {
  try {
    const organizationId = c.req.header("X-Organization-Id");
    console.log('GET /equipment - organizationId:', organizationId);
    if (!organizationId) {
      return c.json({ error: "Organization ID required" }, 400);
    }
    
    const key = `equipment:${organizationId}`;
    console.log('GET /equipment - fetching with key:', key);
    
    const equipment = await kv.get(key);
    console.log('GET /equipment - retrieved:', equipment);
    
    return c.json({ equipment: equipment || [] });
  } catch (error) {
    console.error(`Error fetching equipment: ${error}`);
    return c.json({ error: `Failed to fetch equipment: ${error.message}` }, 500);
  }
});

// Save equipment - USING KV STORE LIKE OTHER DATA
app.post("/make-server-927e49ee/equipment", async (c) => {
  try {
    const { equipment } = await c.req.json();
    const organizationId = c.req.header("X-Organization-Id");
    console.log('POST /equipment - organizationId:', organizationId);
    console.log('POST /equipment - equipment to save:', JSON.stringify(equipment));
    
    if (!organizationId) {
      return c.json({ error: "Organization ID required" }, 400);
    }
    
    const key = `equipment:${organizationId}`;
    console.log('POST /equipment - saving with key:', key);
    
    // Save using KV store - same as users and orgs
    await kv.set(key, equipment);
    console.log('POST /equipment - save complete');
    
    // Verify
    const saved = await kv.get(key);
    console.log('POST /equipment - verified saved data:', saved);
    
    return c.json({ success: true, savedEquipment: saved });
  } catch (error) {
    console.error(`Error saving equipment: ${error}`);
    return c.json({ error: `Failed to save equipment: ${error.message}` }, 500);
  }
});

// Get pending requests for organization
app.get("/make-server-927e49ee/pending-requests", async (c) => {
  try {
    const organizationId = c.req.header("X-Organization-Id");
    if (!organizationId) {
      return c.json({ error: "Organization ID required" }, 400);
    }
    
    const requests = await kv.get(`pending-requests:${organizationId}`);
    return c.json({ requests: requests || [] });
  } catch (error) {
    console.error(`Error fetching pending requests: ${error}`);
    return c.json({ error: `Failed to fetch pending requests: ${error.message}` }, 500);
  }
});

// Approve request
app.post("/make-server-927e49ee/approve-request", async (c) => {
  try {
    const { requestId } = await c.req.json();
    const organizationId = c.req.header("X-Organization-Id");
    
    if (!organizationId || !requestId) {
      return c.json({ error: "Organization ID and Request ID are required" }, 400);
    }
    
    // Get pending requests
    const requestsKey = `pending-requests:${organizationId}`;
    const requests = await kv.get(requestsKey) || [];
    
    // Find the request
    const request = requests.find((r: any) => r.id === requestId);
    if (!request) {
      return c.json({ error: "Request not found" }, 404);
    }
    
    // Get organization settings for final emails
    const orgKey = `org:${organizationId}`;
    const org = await kv.get(orgKey);
    
    if (!org || !org.finalEmails || org.finalEmails.length === 0) {
      return c.json({ error: "No final emails configured" }, 400);
    }
    
    // Send detailed email to final recipients
    let emailResult;
    if (request.type === 'calloff') {
      emailResult = await sendCallOffApprovedEmail(org.finalEmails, request.data);
    } else if (request.type === 'rental') {
      emailResult = await sendRentalApprovedEmail(org.finalEmails, request.data);
    } else if (request.type === 'owned') {
      emailResult = await sendOwnedApprovedEmail(org.finalEmails, request.data);
    }
    
    if (!emailResult?.success) {
      return c.json({ error: `Failed to send approval email: ${emailResult?.error}` }, 500);
    }
    
    // Remove request from pending list
    const updatedRequests = requests.filter((r: any) => r.id !== requestId);
    await kv.set(requestsKey, updatedRequests);
    
    return c.json({ success: true });
  } catch (error) {
    console.error(`Error approving request: ${error}`);
    return c.json({ error: `Failed to approve request: ${error.message}` }, 500);
  }
});

// Deny request
app.post("/make-server-927e49ee/deny-request", async (c) => {
  try {
    const { requestId } = await c.req.json();
    const organizationId = c.req.header("X-Organization-Id");
    
    if (!organizationId || !requestId) {
      return c.json({ error: "Organization ID and Request ID are required" }, 400);
    }
    
    // Get pending requests
    const requestsKey = `pending-requests:${organizationId}`;
    const requests = await kv.get(requestsKey) || [];
    
    // Remove request from pending list
    const updatedRequests = requests.filter((r: any) => r.id !== requestId);
    await kv.set(requestsKey, updatedRequests);
    
    return c.json({ success: true });
  } catch (error) {
    console.error(`Error denying request: ${error}`);
    return c.json({ error: `Failed to deny request: ${error.message}` }, 500);
  }
});

// Email sending helper function using Resend API
async function sendEmail(to: string, subject: string, html: string) {
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      return { success: false, error: "RESEND_API_KEY environment variable not set" };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Equipment Requests <onboarding@resend.dev>",
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return { success: false, error: `Resend API error: ${errorData}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Send approved call off email to final recipients
async function sendCallOffApprovedEmail(emails: string[], data: any) {
  const recipientEmails = emails.join(', ');
  return await sendEmail(
    recipientEmails,
    "✅ Equipment Call Off - APPROVED",
    `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; color: white; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-row { background: white; margin: 10px 0; padding: 15px; border-radius: 5px; border-left: 4px solid #667eea; }
          .label { font-weight: bold; color: #667eea; display: inline-block; width: 150px; }
          .value { color: #333; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .approved-badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Equipment Call Off</h1>
            <span class="approved-badge">APPROVED</span>
          </div>
          <div class="content">
            <div class="info-row">
              <span class="label">Submitted By:</span>
              <span class="value">${data.name}</span>
            </div>
            <div class="info-row">
              <span class="label">Project:</span>
              <span class="value">${data.project || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Equipment Type:</span>
              <span class="value">${data.equipmentType}</span>
            </div>
            <div class="info-row">
              <span class="label">Model:</span>
              <span class="value">${data.model}</span>
            </div>
            <div class="info-row">
              <span class="label">Call Off Date:</span>
              <span class="value">${data.callOffDate}</span>
            </div>
            <div class="info-row">
              <span class="label">Notes:</span>
              <span class="value">${data.notes || 'N/A'}</span>
            </div>
          </div>
          <div class="footer">
            <p>This request has been approved by your organization administrator</p>
            <p>This is an automated message from EquipTrack</p>
          </div>
        </div>
      </body>
      </html>
    `
  );
}

// Send approved rental email to final recipients
async function sendRentalApprovedEmail(emails: string[], data: any) {
  const recipientEmails = emails.join(', ');
  return await sendEmail(
    recipientEmails,
    "✅ Rental Equipment Request - APPROVED",
    `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; color: white; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-row { background: white; margin: 10px 0; padding: 15px; border-radius: 5px; border-left: 4px solid #10b981; }
          .label { font-weight: bold; color: #10b981; display: inline-block; width: 150px; }
          .value { color: #333; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .approved-badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 Rental Equipment Request</h1>
            <span class="approved-badge">APPROVED</span>
          </div>
          <div class="content">
            <div class="info-row">
              <span class="label">Submitted By:</span>
              <span class="value">${data.name}</span>
            </div>
            <div class="info-row">
              <span class="label">Project:</span>
              <span class="value">${data.project || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Equipment Type:</span>
              <span class="value">${data.equipmentType}</span>
            </div>
            <div class="info-row">
              <span class="label">Model:</span>
              <span class="value">${data.model}</span>
            </div>
            <div class="info-row">
              <span class="label">Required By:</span>
              <span class="value">${data.requiredByDate}</span>
            </div>
            <div class="info-row">
              <span class="label">Expected Return:</span>
              <span class="value">${data.expectedReturnDate}</span>
            </div>
            <div class="info-row">
              <span class="label">Notes:</span>
              <span class="value">${data.notes || 'N/A'}</span>
            </div>
          </div>
          <div class="footer">
            <p>This request has been approved by your organization administrator</p>
            <p>This is an automated message from EquipTrack</p>
          </div>
        </div>
      </body>
      </html>
    `
  );
}

// Send approved owned equipment email to final recipients
async function sendOwnedApprovedEmail(emails: string[], data: any) {
  const recipientEmails = emails.join(', ');
  const equipmentRows = data.equipment.map((item: any) => `
    <div class="equipment-item">
      <div class="equipment-detail"><strong>Type:</strong> ${item.equipmentType}</div>
      <div class="equipment-detail"><strong>Model:</strong> ${item.model}</div>
    </div>
  `).join('');
  
  return await sendEmail(
    recipientEmails,
    "✅ Owned Equipment Request - APPROVED",
    `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; color: white; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-row { background: white; margin: 10px 0; padding: 15px; border-radius: 5px; border-left: 4px solid #f59e0b; }
          .label { font-weight: bold; color: #f59e0b; display: inline-block; width: 150px; }
          .value { color: #333; }
          .equipment-list { background: white; margin: 15px 0; padding: 15px; border-radius: 5px; border-left: 4px solid #f59e0b; }
          .equipment-item { background: #f8f9fa; padding: 10px; margin: 10px 0; border-radius: 5px; }
          .equipment-detail { margin: 5px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .approved-badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔧 Owned Equipment Request</h1>
            <span class="approved-badge">APPROVED</span>
          </div>
          <div class="content">
            <div class="info-row">
              <span class="label">Submitted By:</span>
              <span class="value">${data.name}</span>
            </div>
            <div class="info-row">
              <span class="label">Project:</span>
              <span class="value">${data.project || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Notes:</span>
              <span class="value">${data.notes || 'N/A'}</span>
            </div>
            <div class="equipment-list">
              <h3 style="margin-top: 0; color: #f59e0b;">Equipment List (${data.equipment.length} items)</h3>
              ${equipmentRows}
            </div>
          </div>
          <div class="footer">
            <p>This request has been approved by your organization administrator</p>
            <p>This is an automated message from EquipTrack</p>
          </div>
        </div>
      </body>
      </html>
    `
  );
}

Deno.serve(app.fetch);