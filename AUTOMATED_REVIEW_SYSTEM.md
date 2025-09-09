# Automated Asset Review System

## Overview
This system provides automated review capabilities for the Creative Automation Pipeline, using Claude Desktop via MCP tools to perform content moderation and compliance checking of generated marketing assets.

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cron Job      │───▶│   Review Queue   │───▶│  Claude Desktop │
│ (auto-review.sh)│    │   (/tmp/...)     │    │  (MCP Tools)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐                            ┌─────────────────┐
│ Desktop Notif.  │                            │   Gmail Draft   │
│ + Logging       │                            │ + JSON Update   │
└─────────────────┘                            └─────────────────┘
```

## Components

### 1. Cron Script (`scripts/auto-review.sh`)
- **Purpose**: Detects unreviewed campaigns in the output directory
- **Trigger**: Run by crontab at specified intervals  
- **Output**: Adds campaign paths to review queue
- **Notifications**: Desktop alerts when new campaigns found
- **Logging**: Activity logged to `temp/review_log.txt`

### 2. Review Queue (`temp/review_queue.txt`)
- **Purpose**: Communication bridge between cron script and Claude
- **Format**: One campaign directory path per line
- **Management**: Cron adds, Claude processes and removes

### 3. Claude Instructions (`config/claude-review-instructions.txt`)
- **Purpose**: Comprehensive review protocol for Claude to follow
- **Scope**: Brand compliance, content appropriateness, visual quality, format optimization
- **Scoring**: 1-10 scale with clear criteria for pass/fail decisions
- **Output**: Structured JSON updates and Gmail draft creation

### 4. Crontab Configuration (`config/crontab-examples.txt`)
- **Purpose**: Various scheduling options for different use cases
- **Options**: From every 15 minutes to once daily
- **Examples**: Business hours, 24/7, weekend coverage patterns

## Quick Start

### 1. Set Up Cron Schedule
```bash
# Edit your crontab
crontab -e

# Add a line (example: every 30 minutes during business hours)
*/30 9-17 * * 1-5 [PROJECT_ROOT]/scripts/auto-review.sh
```

### 2. Test the Detection Script
```bash
# Run manually to test
./scripts/auto-review.sh

# Check if campaign was queued
cat temp/review_queue.txt

# View activity log
cat temp/review_log.txt
```

### 3. Process Review Queue with Claude
When you receive a desktop notification or want to check for pending reviews:

1. Open Claude Desktop
2. Say: "Check the review queue and process any pending campaigns"
3. Claude will automatically:
   - Read the campaign folder contents
   - Analyze all PNG assets
   - Score each asset (1-10 scale)
   - Update `review_status.json`
   - Create Gmail draft with findings
   - Remove processed campaign from queue

## Review Process

### Campaign Detection
- Scans `output/*/review_status.json` files
- Finds campaigns with `"claudeReviewed": false`
- Queues first unreviewed campaign
- Sends desktop notification

### Claude Analysis
For each campaign, Claude reviews:

#### Brand Compliance (40% weight)
- Color palette adherence
- Required elements (logos, copyright)
- Brand tone consistency
- Font usage

#### Content Appropriateness (30% weight)
- Prohibited content checking
- Cultural sensitivity
- Legal compliance
- Message clarity

#### Visual Quality (20% weight)
- Professional appearance
- Composition balance
- Image resolution
- Text legibility

#### Format Optimization (10% weight)
- Aspect ratio compliance
- Safe area usage
- Platform best practices

### Scoring Scale
- **10**: Perfect - Ready for immediate deployment
- **8-9**: Excellent - Minor enhancements possible
- **6-7**: Good - Some adjustments recommended
- **4-5**: Below standard - Significant issues
- **1-3**: Poor - Major rework required

### Output Updates
Claude updates the campaign's `review_status.json` with:
- Overall compliance score
- Individual asset scores
- Detailed findings and issues
- Specific recommendations
- Pass/Conditional Pass/Fail assessment

### Gmail Draft Creation
Automatic email generation with:
- Executive summary
- Compliance scores
- Detailed findings
- Prioritized recommendations
- Next steps guidance

## File Locations

```
content_engine/
├── scripts/
│   └── auto-review.sh              # Main cron script
├── config/
│   ├── claude-review-instructions.txt  # Review protocol
│   └── crontab-examples.txt        # Scheduling options
├── temp/
│   ├── review_queue.txt            # Campaign paths waiting for review
│   └── review_log.txt              # Activity log from cron script
├── output/
│   └── campaign_*/
│       └── review_status.json      # Campaign review status
└── AUTOMATED_REVIEW_SYSTEM.md     # This documentation
```

## Project Files
All files are now contained within the project directory for better organization:
- `temp/review_queue.txt` - Active review queue
- `temp/review_log.txt` - Activity logging

## Usage Examples

### Daily Operations
1. **Morning**: Cron runs and detects overnight campaign generations
2. **Notification**: Desktop alert: "1 campaign ready for review: campaign_xxx"
3. **Review**: Tell Claude to check the review queue
4. **Result**: Gmail draft in your drafts folder with complete analysis
5. **Action**: Review the draft and send to stakeholders

### High-Volume Periods
- Set cron to run every 15 minutes during peak hours
- Claude can process multiple campaigns throughout the day
- Each campaign gets individual Gmail draft
- Queue prevents duplicates and ensures systematic processing

## Troubleshooting

### No Campaigns Detected
```bash
# Check if campaigns exist
find output -name "review_status.json" -exec grep -l '"claudeReviewed": false' {} \;

# Verify script permissions
ls -la scripts/auto-review.sh

# Test script manually
./scripts/auto-review.sh
```

### Queue Not Processing
- Ensure Claude Desktop is running
- Check `temp/review_queue.txt` exists
- Verify Claude has MCP file access permissions
- Review instructions are in `config/claude-review-instructions.txt`

### Notifications Not Working
- macOS: Check Terminal has Full Disk Access in Privacy settings
- Linux: Ensure `notify-send` is installed
- Test: Run script manually and watch for desktop alert

## Customization

### Adjust Review Criteria
Edit `config/claude-review-instructions.txt` to modify:
- Scoring weights (currently 40/30/20/10)
- Pass/fail thresholds
- Brand-specific requirements
- Assessment categories

### Change Scheduling
Edit crontab with different timing:
```bash
# More frequent during launches
*/10 8-20 * * 1-5 /path/to/auto-review.sh

# Less frequent for stable operations  
0 9,15 * * 1-5 /path/to/auto-review.sh
```

### Modify Notifications
Edit the script's `send_notification()` function for:
- Different notification services
- Custom message formats
- Additional alerting channels

## Security Considerations

- Scripts only read campaign data and write to temp files
- No network connections or external API calls
- Claude uses existing MCP permissions
- Gmail drafts created but not automatically sent
- All file operations use standard user permissions

## Integration with Content Engine

This system is designed as a non-intrusive addition to the existing Creative Automation Pipeline:

- ✅ **No API changes required**
- ✅ **No database modifications needed**
- ✅ **Existing campaign generation unchanged**
- ✅ **Uses established MCP connection**
- ✅ **Leverages existing file structure**

The review system operates independently and can be disabled by simply removing the crontab entry.