# MongoDB Connection Test - Run as Administrator

Write-Host "=== Testing MongoDB Port 27017 ===" -ForegroundColor Cyan

$host1 = "ac-akfvknn-shard-00-00.tf2dof5.mongodb.net"
$port = 27017

Write-Host "Testing connection to $host1`:$port..."
$tcpClient = New-Object System.Net.Sockets.TcpClient
$connect = $tcpClient.BeginConnect($host1, $port, $null, $null)
$wait = $connect.AsyncWaitHandle.WaitOne(3000, $false)

if ($wait) {
    try {
        $tcpClient.EndConnect($connect)
        Write-Host "SUCCESS: Port is reachable" -ForegroundColor Green
        $tcpClient.Close()
    } catch {
        Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "BLOCKED: Timeout - port 27017 is blocked by firewall/network" -ForegroundColor Red
    $tcpClient.Close()
}

Write-Host "`nTO FIX (run as Admin):"
Write-Host "New-NetFirewallRule -DisplayName 'MongoDB' -Direction Outbound -Protocol TCP -RemotePort 27017 -Action Allow"
