"""
Keep-alive service to prevent Render.com free tier from sleeping.
Pings the server every 14 minutes to keep it awake.
"""

import threading
import time
import requests
from datetime import datetime
import os


class KeepAliveService:
    def __init__(self, app_url=None, interval=840):
        """
        Args:
            app_url: URL to ping (e.g., 'https://your-app.onrender.com')
            interval: Ping interval in seconds (default: 840 = 14 minutes)
        """
        self.app_url = app_url or os.environ.get('RENDER_EXTERNAL_URL')
        self.interval = interval
        self.running = False
        self.thread = None

    def ping(self):
        if not self.app_url:
            print("Keep-alive: No URL configured, skipping ping")
            return False
        try:
            url = f"{self.app_url}/api/health"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                print(f"Keep-alive ping successful at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                return True
            else:
                print(f"Keep-alive ping returned status {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"Keep-alive ping failed: {str(e)}")
            return False

    def _run(self):
        print(f"Keep-alive service started. Pinging {self.app_url} every {self.interval/60} minutes")
        # Wait before first ping so app finishes booting
        time.sleep(60)
        while self.running:
            self.ping()
            time.sleep(self.interval)

    def start(self):
        if self.running:
            print("Keep-alive service already running")
            return
        if not self.app_url:
            print("Keep-alive service not started: No URL configured")
            print("Set RENDER_EXTERNAL_URL environment variable to enable keep-alive")
            return
        self.running = True
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()
        print("Keep-alive service thread started")

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        print("Keep-alive service stopped")


# Global singleton
_keep_alive_service = None


def init_keep_alive(app_url=None, interval=840):
    global _keep_alive_service

    # Only on Render. RENDER=true is set automatically by Render platform.
    if not os.environ.get('RENDER'):
        print("Not running on Render, keep-alive service disabled")
        return None

    if _keep_alive_service is None:
        _keep_alive_service = KeepAliveService(app_url=app_url, interval=interval)
        _keep_alive_service.start()

    return _keep_alive_service


def get_keep_alive_service():
    return _keep_alive_service
