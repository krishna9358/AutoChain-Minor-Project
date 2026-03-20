# Quick Start Guide - Workflow Builder

## 🚀 Get Started in 5 Minutes

### 1. Open the Workflow Builder

Navigate to the workflow editor from dashboard:
```
http://localhost:3000/dashboard
```

### 2. Choose Your Building Mode

You have three options:

#### 🎨 Manual Mode (Classic)
- Drag nodes from the left sidebar
- Connect them with lines
- Configure each node
- Best for: Custom workflows

#### 📋 Templates Mode (Fast)
- Browse pre-built templates
- Click "Generate Workflow"
- Customize as needed
- Best for: Common use cases

#### 🤖 AI Mode (Smart)
- Describe your workflow in English
- Click "Generate Workflow"
- LLM generates and normalizes the graph for you
- Best for: Complex automation

---

## 🎯 Example: Build Your First Workflow

### Option A: Use AI (Recommended)

1. Click **"AI Mode"** button
2. Type: "Automate meeting notes and assign tasks to team"
3. Click **"Generate Workflow"**
4. Watch the magic happen! ✨

### Option B: Use a Template

1. Click **"Templates Mode"** button
2. Find "Meeting Intelligence" card
3. Click **"Generate Workflow"**
4. Customize nodes as needed

### Option C: Build Manually

1. Click **"Manual Mode"** button
2. Drag **"Webhook Trigger"** to canvas
3. Drag **"Classification Agent"** below it
4. Connect the two nodes
5. Drag **"Slack"** below the agent
6. Connect agent to Slack
7. Click each node to configure
8. Click **"Publish Pipeline"**

---

## 🎨 Understanding Node Types

### 🔔 Input (Amber)
- Start your workflow
- Example: Entry Point

### 🧠 AI (Purple)
- Intelligent processing
- Examples: AI Agent, Text Transform

### 🔧 Integrations (Blue)
- External integrations
- Examples: HTTP, Slack, Email, GitHub, Google Calendar/Meet/Docs/Sheets

### ⚡ Logic (Green)
- Control flow
- Examples: If/Else, Switch, Loop

### 🎮 Control (Gray)
- Manage execution
- Examples: Approval, Delay, Error Handler

---

## 💡 Pro Tips

### Tip 1: Use AI for Complex Workflows
Don't waste time manually building complex workflows. Just describe what you want:
- "Create a customer support automation workflow"
- "Automate lead scoring and email outreach"
- "Build incident management alert system"

### Tip 2: Explain Your Workflow
After generating a workflow, click **"Explain Workflow"** to see:
- Step-by-step breakdown
- AI insights for each step
- What each node does

### Tip 3: Start with Templates
Templates are pre-configured and tested. Use them as starting points:
- Meeting Intelligence → Perfect for team productivity
- Customer Support → Great for automation
- Sales Outreach → Ideal for marketing

### Tip 4: Mix and Match
You can:
- Generate with AI
- Then switch to Manual mode
- Add/remove nodes
- Customize the workflow

---

## 🎯 Common Workflows

### 1. Meeting Intelligence
```
File Upload → Extract Tasks → Assign Owners → Create Slack Tasks → Verify
```

### 2. Customer Support
```
Webhook → Classify Issue → Search KB → Draft Response → Approval → Email
```

### 3. Sales Outreach
```
API Trigger → Research Company → Score Lead → Generate Email → Send via Gmail
```

### 4. Incident Management
```
Webhook → Analyze Logs → Determine Severity → Create Ticket → Notify DevOps
```

---

## ⚙️ Configuring Nodes

### Step 1: Click a Node
Click any node on the canvas to open the configuration panel.

### Step 2: Select Integration
Choose from available triggers or actions.

### Step 3: Set Parameters
- For Email: Recipient address, message body
- For Webhook: URL (auto-generated)
- For Slack: Channel, message format
- For AI Agents: Model, temperature, prompt

### Step 4: Save
Click outside the panel or close it to save.

---

## 🚀 Publishing Your Workflow

### Before Publishing
✅ Connect all nodes  
✅ Configure each node  
✅ Test with sample data (if possible)

### Publish
1. Click **"Publish Pipeline"** in top-right
2. Workflow is saved to your backend
3. You'll be redirected to Dashboard

### After Publishing
- View in Dashboard
- Monitor execution
- View logs and errors

---

## 🔧 Troubleshooting

### Issue: Can't connect nodes
**Solution**: Nodes must overlap. Drag them closer together.

### Issue: "Node not configured" error
**Solution**: Click the node and configure it properly.

### Issue: AI generation takes too long
**Solution**: Try a simpler description or use templates.

### Issue: Workflow not publishing
**Solution**: Check that:
- You have a trigger node
- All nodes are configured
- Nodes are connected properly

---

## 🎓 Learning Path

### Beginner
1. Start with Templates
2. Generate with AI
3. Explore node configurations

### Intermediate
1. Build manual workflows
2. Mix AI + Manual
3. Customize templates

### Advanced
1. Create complex logic flows
2. Use conditionals and loops
3. Optimize for performance

---

## 📚 Next Steps

1. **Explore**: Browse all 18 node types
2. **Experiment**: Try different AI prompts
3. **Customize**: Modify templates to fit your needs
4. **Deploy**: Publish and monitor your workflows

---

## 💬 Support

### Questions?
- Check the full documentation: `docs/NODE_REFERENCE.md`
- Use docs index: `docs/README.md`
- Review example workflows in Templates
- Use "Explain Workflow" to understand any workflow

### Want to Add Custom Nodes?
Edit: `frontend/components/workflow/config/nodeTypes.ts`

```typescript
{
  id: 'your-node',
  name: 'Your Node',
  category: 'tool',
  icon: YourIcon,
  description: 'What it does',
  // ... more config
}
```

---

## 🎉 You're Ready!

You now have everything you need to build powerful workflows with AI assistance. 

**Remember**: The fastest way to build a workflow is to describe it in AI Mode!

**Happy Building! 🚀**