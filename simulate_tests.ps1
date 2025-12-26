# Superior Closings CRM - Simulation Test Script
# Run this to test all features without using Twilio credits!

$BaseUrl = "http://localhost:3000/api/sms/webhook"
$From = "+15550009999" # Fake simulation number

function Send-Simulation {
    param (
        [string]$Body,
        [string]$Sid
    )
    Write-Host "Simulating SMS: '$Body'" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri $BaseUrl -Method POST -Body @{
            From = $From
            Body = $Body
            MessageSid = $Sid
        }
        Write-Host "Server Response: $response" -ForegroundColor Green
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
    Write-Host "------------------------------------------------"
}

# 1. Create a Lead
Send-Simulation -Body "Add lead: Sim User, sim@example.com, 555-999-8888" -Sid "SM_sim_create_01"
Start-Sleep -Seconds 2

# 2. Check Status
Send-Simulation -Body "Show status for Sim User" -Sid "SM_sim_status_01"
Start-Sleep -Seconds 2

# 3. Send Booking Link
Send-Simulation -Body "Send booking link to Sim User" -Sid "SM_sim_book_01"
Start-Sleep -Seconds 2

# 4. Send Review Link
Send-Simulation -Body "Send review link to Sim User" -Sid "SM_sim_review_01"
Start-Sleep -Seconds 2

# 5. Schedule Follow-up
Send-Simulation -Body "Follow up Sim User, in 3 days" -Sid "SM_sim_followup_01"

Write-Host "Simulation Complete!" -ForegroundColor Yellow
Write-Host "-> Check your Dashboard (http://localhost:3000) to see 'Sim User'."
Write-Host "-> Check your Terminal to see 'Scheduled SMS' logs."
