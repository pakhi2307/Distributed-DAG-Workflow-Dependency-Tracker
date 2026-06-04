const baseURL = 'http://localhost:5000/api';

async function runTests() {
  console.log("🚀 Starting Glassboard Verification Tests...\n");

  try {
    const orgName = "Test Org " + Date.now();
    const adminEmail = "admin_" + Date.now() + "@example.com";
    const memberEmail = "member_" + Date.now() + "@example.com";

    // 1. Create Organization (creates organization + Admin user)
    console.log("➡️ Creating organization & admin user...");
    const orgRes = await fetch(`${baseURL}/organizations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: orgName,
        adminName: "Test Admin",
        adminEmail: adminEmail,
        adminPassword: "password123"
      })
    });
    const orgData = await orgRes.json();
    if (orgRes.status !== 201) {
      throw new Error(`Failed to create org: ${JSON.stringify(orgData)}`);
    }
    const orgId = orgData.data.id;
    console.log(`✅ Organization created successfully: ${orgId}`);

    // 2. Register a regular MEMBER (Viewer) user
    console.log("➡️ Registering regular MEMBER...");
    const memberRegRes = await fetch(`${baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgId: orgId,
        name: "Test Member",
        email: memberEmail,
        password: "password123",
        role: "MEMBER"
      })
    });
    const memberRegData = await memberRegRes.json();
    if (memberRegRes.status !== 201) {
      throw new Error(`Failed to register member: ${JSON.stringify(memberRegData)}`);
    }
    console.log("✅ Member registered successfully");

    // 3. Login both users to acquire JWT tokens
    console.log("➡️ Logging in Admin...");
    const adminLoginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: "password123" })
    });
    const adminLogin = await adminLoginRes.json();
    const adminToken = adminLogin.token;
    const adminUser = adminLogin.user;

    console.log("➡️ Logging in Member...");
    const memberLoginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: memberEmail, password: "password123" })
    });
    const memberLogin = await memberLoginRes.json();
    const memberToken = memberLogin.token;
    const memberUser = memberLogin.user;

    console.log("✅ Logged in successfully. Received auth tokens.\n");

    // 4. Test RBAC: Member tries to create a project (should fail)
    console.log("🔒 RBAC TEST: Member attempting to create a project (Should be Forbidden)...");
    const projFailRes = await fetch(`${baseURL}/projects`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`
      },
      body: JSON.stringify({ name: "Unauthorized Project" })
    });
    const projFailData = await projFailRes.json();
    console.log(`Status: ${projFailRes.status}, Error: ${projFailData.error}`);
    if (projFailRes.status === 403) {
      console.log("✅ SUCCESS: Properly rejected with 403 Forbidden!");
    } else {
      throw new Error("❌ FAILURE: Non-admin was allowed to create a project or returned incorrect status!");
    }

    // 5. Create Project as Admin (should succeed)
    console.log("\n➡️ Creating project as Admin...");
    const projRes = await fetch(`${baseURL}/projects`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ name: "Core Infrastructure", status: "ACTIVE" })
    });
    const projData = await projRes.json();
    if (projRes.status !== 201) {
      throw new Error(`Failed to create project: ${JSON.stringify(projData)}`);
    }
    const projectId = projData.data.id;
    console.log(`✅ Project created: ${projectId}`);

    // 6. Test RBAC: Member tries to create a module (should fail)
    console.log("\n🔒 RBAC TEST: Member attempting to create a module (Should be Forbidden)...");
    const modFailRes = await fetch(`${baseURL}/modules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`
      },
      body: JSON.stringify({
        projectId: projectId,
        ownerId: memberUser.id,
        title: "Unauthorized Module"
      })
    });
    const modFailData = await modFailRes.json();
    console.log(`Status: ${modFailRes.status}, Error: ${modFailData.error}`);
    if (modFailRes.status === 403) {
      console.log("✅ SUCCESS: Properly rejected with 403 Forbidden!");
    } else {
      throw new Error("❌ FAILURE: Member was allowed to create a module!");
    }

    // 7. Admin creates Module A (duration = 5 days) & Module B (duration = 10 days)
    console.log("\n➡️ Creating Modules as Admin...");
    const createdDate = new Date();
    const dateA = new Date();
    dateA.setDate(createdDate.getDate() + 5);
    const dateB = new Date();
    dateB.setDate(createdDate.getDate() + 10);

    const modARes = await fetch(`${baseURL}/modules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        projectId: projectId,
        ownerId: adminUser.id,
        title: "Database Design",
        expectedCompletionDate: dateA.toISOString()
      })
    });
    const modA = (await modARes.json()).data;
    console.log(`✅ Module A created: ${modA.id} ("${modA.title}", expected: +5 days)`);

    const modBRes = await fetch(`${baseURL}/modules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        projectId: projectId,
        ownerId: adminUser.id,
        title: "API Implementation",
        expectedCompletionDate: dateB.toISOString()
      })
    });
    const modB = (await modBRes.json()).data;
    console.log(`✅ Module B created: ${modB.id} ("${modB.title}", expected: +10 days)`);

    // 8. Add Dependency: Module B depends on Module A (flows A -> B)
    console.log("\n➡️ Adding dependency: Module B depends on Module A...");
    const depRes = await fetch(`${baseURL}/dependencies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        moduleId: modB.id,
        dependsOnId: modA.id
      })
    });
    const depData = await depRes.json();
    if (depRes.status !== 201) {
      throw new Error(`Failed to add dependency: ${JSON.stringify(depData)}`);
    }
    console.log("✅ Dependency added successfully");

    // 9. Fetch Critical Path
    console.log("\n📈 Testing Critical Path calculations (using actual durations in days)...");
    const cpRes = await fetch(`${baseURL}/dependencies/projects/${projectId}/critical-path`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const cpData = await cpRes.json();
    console.log("Critical Path Result:", cpData);
    if (cpData.criticalPathIds && cpData.criticalPathIds.length === 2) {
      console.log("✅ SUCCESS: Critical Path correctly identified both dependent modules.");
    } else {
      throw new Error(`❌ FAILURE: Incorrect critical path: ${JSON.stringify(cpData)}`);
    }

    // 10. Fetch React Flow Project Graph Data and check edge animations
    console.log("\n🕸️ Fetching project graph layout details...");
    const graphRes = await fetch(`${baseURL}/modules/graph/${projectId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const graphData = await graphRes.json();
    console.log("Graph Nodes Count:", graphData.nodes.length);
    console.log("Graph Edges Count:", graphData.edges.length);
    
    // Assert critical path edges are animated
    const criticalEdge = graphData.edges.find(e => e.id === `e-${modB.id}-${modA.id}`);
    console.log("Critical Path Edge Details:", criticalEdge);
    if (criticalEdge && criticalEdge.animated === true && criticalEdge.style.stroke === '#ef4444') {
      console.log("✅ SUCCESS: Critical path edges are highlighted and animated!");
    } else {
      throw new Error("❌ FAILURE: Critical path edges are not highlighted/animated correctly in graph data!");
    }

    // 11. Test Update Module (CRUD)
    console.log("\n➡️ Testing Module Edit (CRUD)...");
    const editRes = await fetch(`${baseURL}/modules/${modA.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: "Relational DB Design"
      })
    });
    const editData = await editRes.json();
    if (editRes.status !== 200) {
      throw new Error(`Failed to edit module: ${JSON.stringify(editData)}`);
    }
    console.log(`✅ Module A title successfully updated to: "${editData.data.title}"`);

    // 12. Test Cascade Delete Module (CRUD)
    console.log("\n➡️ Testing Cascade Delete Module (CRUD)...");
    const deleteRes = await fetch(`${baseURL}/modules/${modA.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const deleteData = await deleteRes.json();
    if (deleteRes.status !== 200) {
      throw new Error(`Failed to delete module: ${JSON.stringify(deleteData)}`);
    }
    console.log("✅ Module A deleted successfully");

    // Verify dependencies and modules are cleared
    const checkGraphRes = await fetch(`${baseURL}/modules/graph/${projectId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const checkGraph = await checkGraphRes.json();
    const remainingEdge = checkGraph.edges.find(e => e.id === `e-${modB.id}-${modA.id}`);
    if (!remainingEdge && checkGraph.nodes.length === 1) {
      console.log("✅ SUCCESS: Cascade delete successfully cleaned up dependent edges and nodes in transaction.");
    } else {
      throw new Error(`❌ FAILURE: Cascade delete left orphaned edges or nodes: ${JSON.stringify(checkGraph)}`);
    }

    console.log("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉");
  } catch (err) {
    console.error("\n❌ TEST RUN ENCOUNTERED AN ERROR:", err);
    process.exit(1);
  }
}

runTests();
