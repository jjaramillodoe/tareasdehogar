#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Tareas del Hogar (House Chores) System
Testing authentication, family management, children CRUD, chores workflow, and payments
"""

import requests
import json
import time
import random
from datetime import datetime

# Configuration
BASE_URL = "https://kids-rewards.preview.emergentagent.com/api"
TEST_EMAIL = f"parent_{int(time.time())}@test.com"
TEST_PASSWORD = "testpass123"
TEST_NAME = "Test Parent"

class APITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.user_id = None
        self.family_id = None
        self.children = []
        self.chores = []
        self.results = {"passed": 0, "failed": 0, "tests": []}
    
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def test_result(self, test_name, success, message, response=None):
        status = "✅ PASS" if success else "❌ FAIL"
        self.log(f"{status} - {test_name}: {message}")
        
        test_info = {
            "name": test_name,
            "success": success,
            "message": message,
            "status_code": response.status_code if response else None,
            "response": response.json() if response and response.headers.get('content-type', '').startswith('application/json') else None
        }
        self.results["tests"].append(test_info)
        
        if success:
            self.results["passed"] += 1
        else:
            self.results["failed"] += 1
            if response:
                self.log(f"Error details - Status: {response.status_code}, Response: {response.text}", "ERROR")
    
    def get_headers(self, include_auth=True):
        headers = {"Content-Type": "application/json"}
        if include_auth and self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers
    
    # ==================== AUTHENTICATION TESTS ====================
    
    def test_user_registration(self):
        """Test POST /auth/register"""
        self.log("Testing user registration...")
        
        data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/register", json=data, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if "access_token" in result and "user" in result:
                    self.token = result["access_token"]
                    self.user_id = result["user"]["id"]
                    self.test_result("User Registration", True, f"User registered successfully with ID: {self.user_id}", response)
                else:
                    self.test_result("User Registration", False, "Missing access_token or user in response", response)
            else:
                self.test_result("User Registration", False, f"Registration failed with status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("User Registration", False, f"Registration request failed: {str(e)}")
    
    def test_user_login(self):
        """Test POST /auth/login"""
        self.log("Testing user login...")
        
        data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", json=data, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if "access_token" in result and "user" in result:
                    # Update token (should be same as registration)
                    login_token = result["access_token"]
                    self.test_result("User Login", True, "Login successful", response)
                else:
                    self.test_result("User Login", False, "Missing access_token or user in response", response)
            else:
                self.test_result("User Login", False, f"Login failed with status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("User Login", False, f"Login request failed: {str(e)}")
    
    def test_get_me(self):
        """Test GET /auth/me"""
        self.log("Testing get current user...")
        
        try:
            response = requests.get(f"{self.base_url}/auth/me", headers=self.get_headers(), timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if "id" in result and "email" in result and "name" in result:
                    self.test_result("Get Me", True, f"User info retrieved: {result['name']} ({result['email']})", response)
                else:
                    self.test_result("Get Me", False, "Missing required fields in user info", response)
            else:
                self.test_result("Get Me", False, f"Get me failed with status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Get Me", False, f"Get me request failed: {str(e)}")
    
    # ==================== FAMILY TESTS ====================
    
    def test_create_family(self):
        """Test POST /families"""
        self.log("Testing family creation...")
        
        data = {
            "name": "Familia Test",
            "currency": "MXN"
        }
        
        try:
            response = requests.post(f"{self.base_url}/families", json=data, headers=self.get_headers(), timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if "id" in result and "name" in result:
                    self.family_id = result["id"]
                    self.test_result("Create Family", True, f"Family created with ID: {self.family_id}", response)
                else:
                    self.test_result("Create Family", False, "Missing id or name in response", response)
            else:
                self.test_result("Create Family", False, f"Family creation failed with status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Create Family", False, f"Create family request failed: {str(e)}")
    
    def test_get_family(self):
        """Test GET /families/my"""
        self.log("Testing get family...")
        
        try:
            response = requests.get(f"{self.base_url}/families/my", headers=self.get_headers(), timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if "id" in result and "name" in result:
                    self.test_result("Get Family", True, f"Family retrieved: {result['name']}", response)
                else:
                    self.test_result("Get Family", False, "Missing required fields in family info", response)
            else:
                self.test_result("Get Family", False, f"Get family failed with status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Get Family", False, f"Get family request failed: {str(e)}")
    
    def test_update_family(self):
        """Test PUT /families/my"""
        self.log("Testing family update...")
        
        data = {
            "name": "Familia Test Actualizada",
            "currency": "USD"
        }
        
        try:
            response = requests.put(f"{self.base_url}/families/my", json=data, headers=self.get_headers(), timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("name") == "Familia Test Actualizada" and result.get("currency") == "USD":
                    self.test_result("Update Family", True, "Family updated successfully", response)
                else:
                    self.test_result("Update Family", False, "Family update not reflected in response", response)
            else:
                self.test_result("Update Family", False, f"Family update failed with status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Update Family", False, f"Update family request failed: {str(e)}")
    
    # ==================== CHILDREN TESTS ====================
    
    def test_create_child(self):
        """Test POST /children"""
        self.log("Testing child creation...")
        
        children_data = [
            {"name": "Ana", "age": 10, "alias": "Anita", "pin": "1234"},
            {"name": "Carlos", "age": 15, "alias": "Carlitos"},
            {"name": "Sofia", "age": 8, "pin": "5678"}
        ]
        
        for child_data in children_data:
            try:
                response = requests.post(f"{self.base_url}/children", json=child_data, headers=self.get_headers(), timeout=30)
                
                if response.status_code == 200:
                    result = response.json()
                    if "id" in result and "name" in result and result["age"] < 18:
                        self.children.append(result)
                        self.test_result("Create Child", True, f"Child {result['name']} created with ID: {result['id']}", response)
                    else:
                        self.test_result("Create Child", False, f"Invalid child data for {child_data['name']}", response)
                else:
                    self.test_result("Create Child", False, f"Child creation failed for {child_data['name']} - status {response.status_code}", response)
            
            except Exception as e:
                self.test_result("Create Child", False, f"Create child request failed for {child_data['name']}: {str(e)}")
    
    def test_age_validation(self):
        """Test age validation (should be < 18)"""
        self.log("Testing child age validation...")
        
        invalid_child = {"name": "Adult Child", "age": 20}
        
        try:
            response = requests.post(f"{self.base_url}/children", json=invalid_child, headers=self.get_headers(), timeout=30)
            
            if response.status_code == 400:
                self.test_result("Age Validation", True, "Age validation working - rejected age >= 18", response)
            else:
                self.test_result("Age Validation", False, f"Age validation failed - should reject age >= 18, got status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Age Validation", False, f"Age validation test failed: {str(e)}")
    
    def test_get_children(self):
        """Test GET /children"""
        self.log("Testing get children list...")
        
        try:
            response = requests.get(f"{self.base_url}/children", headers=self.get_headers(), timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list) and len(result) == len(self.children):
                    self.test_result("Get Children", True, f"Retrieved {len(result)} children", response)
                else:
                    self.test_result("Get Children", False, f"Expected {len(self.children)} children, got {len(result) if isinstance(result, list) else 'non-list'}", response)
            else:
                self.test_result("Get Children", False, f"Get children failed with status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Get Children", False, f"Get children request failed: {str(e)}")
    
    def test_get_single_child(self):
        """Test GET /children/{id}"""
        if not self.children:
            self.test_result("Get Single Child", False, "No children created to test")
            return
        
        child = self.children[0]
        self.log(f"Testing get single child: {child['name']}...")
        
        try:
            response = requests.get(f"{self.base_url}/children/{child['id']}", headers=self.get_headers(), timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("id") == child["id"] and result.get("name") == child["name"]:
                    self.test_result("Get Single Child", True, f"Retrieved child {result['name']}", response)
                else:
                    self.test_result("Get Single Child", False, "Child data mismatch", response)
            else:
                self.test_result("Get Single Child", False, f"Get single child failed with status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Get Single Child", False, f"Get single child request failed: {str(e)}")
    
    def test_update_child(self):
        """Test PUT /children/{id}"""
        if not self.children:
            self.test_result("Update Child", False, "No children created to test")
            return
        
        child = self.children[0]
        self.log(f"Testing update child: {child['name']}...")
        
        update_data = {
            "name": "Ana Actualizada",
            "age": 11
        }
        
        try:
            response = requests.put(f"{self.base_url}/children/{child['id']}", json=update_data, headers=self.get_headers(), timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("name") == "Ana Actualizada" and result.get("age") == 11:
                    self.test_result("Update Child", True, f"Child updated to {result['name']}, age {result['age']}", response)
                    # Update local data
                    self.children[0].update({"name": "Ana Actualizada", "age": 11})
                else:
                    self.test_result("Update Child", False, "Child update not reflected in response", response)
            else:
                self.test_result("Update Child", False, f"Update child failed with status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Update Child", False, f"Update child request failed: {str(e)}")
    
    # ==================== CHORES TESTS ====================
    
    def test_create_chores(self):
        """Test POST /chores"""
        self.log("Testing chore creation...")
        
        if not self.children:
            self.test_result("Create Chores", False, "No children available to assign chores")
            return
        
        chores_data = [
            {
                "title": "Lavar los platos", 
                "description": "Lavar todos los platos después de la cena",
                "amount": 25.0,
                "frequency": "diaria",
                "assigned_to": [self.children[0]["id"]]
            },
            {
                "title": "Hacer la cama",
                "description": "Tender la cama todas las mañanas", 
                "amount": 15.0,
                "frequency": "diaria",
                "assigned_to": [self.children[1]["id"]] if len(self.children) > 1 else [self.children[0]["id"]]
            },
            {
                "title": "Limpiar el jardín",
                "description": "Recoger hojas y regar plantas",
                "amount": 100.0,
                "frequency": "semanal",
                "assigned_to": [child["id"] for child in self.children[:2]]
            }
        ]
        
        for chore_data in chores_data:
            try:
                response = requests.post(f"{self.base_url}/chores", json=chore_data, headers=self.get_headers(), timeout=30)
                
                if response.status_code == 200:
                    result = response.json()
                    if "id" in result and result.get("status") == "pendiente":
                        self.chores.append(result)
                        self.test_result("Create Chore", True, f"Chore '{result['title']}' created with ID: {result['id']}", response)
                    else:
                        self.test_result("Create Chore", False, f"Invalid chore data for '{chore_data['title']}'", response)
                else:
                    self.test_result("Create Chore", False, f"Chore creation failed for '{chore_data['title']}' - status {response.status_code}", response)
            
            except Exception as e:
                self.test_result("Create Chore", False, f"Create chore request failed for '{chore_data['title']}': {str(e)}")
    
    def test_frequency_validation(self):
        """Test frequency validation"""
        self.log("Testing chore frequency validation...")
        
        invalid_chore = {
            "title": "Invalid Frequency Test",
            "amount": 10.0,
            "frequency": "invalid_freq",
            "assigned_to": [self.children[0]["id"]] if self.children else []
        }
        
        try:
            response = requests.post(f"{self.base_url}/chores", json=invalid_chore, headers=self.get_headers(), timeout=30)
            
            if response.status_code == 400:
                self.test_result("Frequency Validation", True, "Frequency validation working - rejected invalid frequency", response)
            else:
                self.test_result("Frequency Validation", False, f"Frequency validation failed - should reject invalid frequency, got status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Frequency Validation", False, f"Frequency validation test failed: {str(e)}")
    
    def test_get_chores(self):
        """Test GET /chores"""
        self.log("Testing get chores list...")
        
        try:
            response = requests.get(f"{self.base_url}/chores", headers=self.get_headers(), timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list) and len(result) == len(self.chores):
                    self.test_result("Get Chores", True, f"Retrieved {len(result)} chores", response)
                else:
                    self.test_result("Get Chores", False, f"Expected {len(self.chores)} chores, got {len(result) if isinstance(result, list) else 'non-list'}", response)
            else:
                self.test_result("Get Chores", False, f"Get chores failed with status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Get Chores", False, f"Get chores request failed: {str(e)}")
    
    def test_get_chores_by_status(self):
        """Test GET /chores?status=pendiente"""
        self.log("Testing get chores by status...")
        
        try:
            response = requests.get(f"{self.base_url}/chores?status=pendiente", headers=self.get_headers(), timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list):
                    pending_count = len([c for c in self.chores if c.get("status") == "pendiente"])
                    if len(result) == pending_count:
                        self.test_result("Get Chores by Status", True, f"Retrieved {len(result)} pending chores", response)
                    else:
                        self.test_result("Get Chores by Status", False, f"Expected {pending_count} pending chores, got {len(result)}", response)
                else:
                    self.test_result("Get Chores by Status", False, "Response is not a list", response)
            else:
                self.test_result("Get Chores by Status", False, f"Get chores by status failed with status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Get Chores by Status", False, f"Get chores by status request failed: {str(e)}")
    
    def test_get_chores_for_child(self):
        """Test GET /chores/child/{child_id}"""
        if not self.children:
            self.test_result("Get Chores for Child", False, "No children available to test")
            return
        
        child = self.children[0]
        self.log(f"Testing get chores for child: {child['name']}...")
        
        try:
            response = requests.get(f"{self.base_url}/chores/child/{child['id']}", headers=self.get_headers(), timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list):
                    self.test_result("Get Chores for Child", True, f"Retrieved {len(result)} chores for {child['name']}", response)
                else:
                    self.test_result("Get Chores for Child", False, "Response is not a list", response)
            else:
                self.test_result("Get Chores for Child", False, f"Get chores for child failed with status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Get Chores for Child", False, f"Get chores for child request failed: {str(e)}")
    
    # ==================== CHORE COMPLETION FLOW TESTS ====================
    
    def test_complete_chore(self):
        """Test POST /chores/{id}/complete"""
        if not self.chores or not self.children:
            self.test_result("Complete Chore", False, "No chores or children available to test")
            return
        
        chore = self.chores[0]
        child_id = chore["assigned_to"][0] if chore["assigned_to"] else None
        
        if not child_id:
            self.test_result("Complete Chore", False, "No child assigned to test chore")
            return
        
        self.log(f"Testing chore completion: {chore['title']}...")
        
        complete_data = {"comment": "Tarea completada correctamente"}
        
        try:
            response = requests.post(
                f"{self.base_url}/chores/{chore['id']}/complete?child_id={child_id}", 
                json=complete_data, 
                headers=self.get_headers(), 
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("status") == "completada" and result.get("completed_by") == child_id:
                    self.test_result("Complete Chore", True, f"Chore '{chore['title']}' completed by child", response)
                    # Update local chore data
                    self.chores[0].update({"status": "completada", "completed_by": child_id})
                else:
                    self.test_result("Complete Chore", False, "Chore completion not reflected properly", response)
            else:
                self.test_result("Complete Chore", False, f"Complete chore failed with status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Complete Chore", False, f"Complete chore request failed: {str(e)}")
    
    def test_approve_chore(self):
        """Test POST /chores/{id}/approve"""
        if not self.chores:
            self.test_result("Approve Chore", False, "No chores available to test")
            return
        
        # Find a completed chore
        completed_chore = None
        for chore in self.chores:
            if chore.get("status") == "completada":
                completed_chore = chore
                break
        
        if not completed_chore:
            self.test_result("Approve Chore", False, "No completed chores available to approve")
            return
        
        self.log(f"Testing chore approval: {completed_chore['title']}...")
        
        try:
            response = requests.post(
                f"{self.base_url}/chores/{completed_chore['id']}/approve", 
                headers=self.get_headers(), 
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("status") == "aprobada":
                    self.test_result("Approve Chore", True, f"Chore '{completed_chore['title']}' approved successfully", response)
                    # Update local chore data
                    for i, chore in enumerate(self.chores):
                        if chore["id"] == completed_chore["id"]:
                            self.chores[i].update({"status": "aprobada"})
                            break
                else:
                    self.test_result("Approve Chore", False, "Chore approval not reflected properly", response)
            else:
                self.test_result("Approve Chore", False, f"Approve chore failed with status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Approve Chore", False, f"Approve chore request failed: {str(e)}")
    
    def test_reject_chore(self):
        """Test POST /chores/{id}/reject"""
        # First, complete another chore to test rejection
        if len(self.chores) < 2 or not self.children:
            self.test_result("Reject Chore", False, "Not enough chores or children to test rejection")
            return
        
        chore = self.chores[1]  # Use second chore
        child_id = chore["assigned_to"][0] if chore["assigned_to"] else None
        
        if not child_id:
            self.test_result("Reject Chore", False, "No child assigned to test chore for rejection")
            return
        
        # First complete the chore
        self.log(f"Completing chore for rejection test: {chore['title']}...")
        
        try:
            # Complete the chore first
            complete_response = requests.post(
                f"{self.base_url}/chores/{chore['id']}/complete?child_id={child_id}",
                json={"comment": "Test completion for rejection"},
                headers=self.get_headers(),
                timeout=30
            )
            
            if complete_response.status_code != 200:
                self.test_result("Reject Chore", False, "Failed to complete chore for rejection test")
                return
            
            # Now reject it
            self.log(f"Testing chore rejection: {chore['title']}...")
            
            response = requests.post(
                f"{self.base_url}/chores/{chore['id']}/reject", 
                headers=self.get_headers(), 
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("status") == "rechazada":
                    self.test_result("Reject Chore", True, f"Chore '{chore['title']}' rejected successfully", response)
                else:
                    self.test_result("Reject Chore", False, "Chore rejection not reflected properly", response)
            else:
                self.test_result("Reject Chore", False, f"Reject chore failed with status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Reject Chore", False, f"Reject chore request failed: {str(e)}")
    
    def test_reset_chore(self):
        """Test POST /chores/{id}/reset"""
        if not self.chores:
            self.test_result("Reset Chore", False, "No chores available to test")
            return
        
        # Use the rejected chore if available, or any non-pending chore
        reset_chore = None
        for chore in self.chores:
            if chore.get("status") != "pendiente":
                reset_chore = chore
                break
        
        if not reset_chore:
            self.test_result("Reset Chore", False, "No non-pending chores available to reset")
            return
        
        self.log(f"Testing chore reset: {reset_chore['title']}...")
        
        try:
            response = requests.post(
                f"{self.base_url}/chores/{reset_chore['id']}/reset", 
                headers=self.get_headers(), 
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("status") == "pendiente":
                    self.test_result("Reset Chore", True, f"Chore '{reset_chore['title']}' reset to pending successfully", response)
                else:
                    self.test_result("Reset Chore", False, "Chore reset not reflected properly", response)
            else:
                self.test_result("Reset Chore", False, f"Reset chore failed with status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Reset Chore", False, f"Reset chore request failed: {str(e)}")
    
    # ==================== PAYMENTS & STATS TESTS ====================
    
    def test_get_payments(self):
        """Test GET /payments"""
        self.log("Testing get payments...")
        
        try:
            response = requests.get(f"{self.base_url}/payments", headers=self.get_headers(), timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list):
                    self.test_result("Get Payments", True, f"Retrieved {len(result)} payments", response)
                else:
                    self.test_result("Get Payments", False, "Response is not a list", response)
            else:
                self.test_result("Get Payments", False, f"Get payments failed with status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Get Payments", False, f"Get payments request failed: {str(e)}")
    
    def test_get_child_payments(self):
        """Test GET /payments/child/{child_id}"""
        if not self.children:
            self.test_result("Get Child Payments", False, "No children available to test")
            return
        
        child = self.children[0]
        self.log(f"Testing get payments for child: {child['name']}...")
        
        try:
            response = requests.get(f"{self.base_url}/payments/child/{child['id']}", headers=self.get_headers(), timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list):
                    self.test_result("Get Child Payments", True, f"Retrieved {len(result)} payments for {child['name']}", response)
                else:
                    self.test_result("Get Child Payments", False, "Response is not a list", response)
            else:
                self.test_result("Get Child Payments", False, f"Get child payments failed with status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Get Child Payments", False, f"Get child payments request failed: {str(e)}")
    
    def test_get_child_stats(self):
        """Test GET /stats/child/{child_id}"""
        if not self.children:
            self.test_result("Get Child Stats", False, "No children available to test")
            return
        
        child = self.children[0]
        self.log(f"Testing get stats for child: {child['name']}...")
        
        try:
            response = requests.get(f"{self.base_url}/stats/child/{child['id']}", headers=self.get_headers(), timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                required_fields = ["child_id", "balance", "pending_tasks", "completed_tasks", "approved_tasks"]
                if all(field in result for field in required_fields):
                    self.test_result("Get Child Stats", True, f"Stats for {child['name']}: balance={result['balance']}, pending={result['pending_tasks']}, completed={result['completed_tasks']}", response)
                else:
                    missing_fields = [f for f in required_fields if f not in result]
                    self.test_result("Get Child Stats", False, f"Missing required fields: {missing_fields}", response)
            else:
                self.test_result("Get Child Stats", False, f"Get child stats failed with status {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Get Child Stats", False, f"Get child stats request failed: {str(e)}")
    
    # ==================== EDGE CASES AND VALIDATION ====================
    
    def test_unauthorized_access(self):
        """Test endpoints without authentication"""
        self.log("Testing unauthorized access...")
        
        try:
            # Try to access protected endpoint without token
            response = requests.get(f"{self.base_url}/families/my", timeout=30)
            
            if response.status_code == 401:
                self.test_result("Unauthorized Access", True, "Protected endpoint correctly requires authentication", response)
            else:
                self.test_result("Unauthorized Access", False, f"Protected endpoint should return 401, got {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Unauthorized Access", False, f"Unauthorized access test failed: {str(e)}")
    
    def test_invalid_child_assignment(self):
        """Test assigning chore to non-existent child"""
        self.log("Testing invalid child assignment...")
        
        invalid_chore = {
            "title": "Invalid Assignment Test",
            "amount": 10.0,
            "frequency": "unica",
            "assigned_to": ["non-existent-child-id"]
        }
        
        try:
            response = requests.post(f"{self.base_url}/chores", json=invalid_chore, headers=self.get_headers(), timeout=30)
            
            if response.status_code == 400:
                self.test_result("Invalid Child Assignment", True, "Invalid child assignment correctly rejected", response)
            else:
                self.test_result("Invalid Child Assignment", False, f"Invalid child assignment should return 400, got {response.status_code}", response)
        
        except Exception as e:
            self.test_result("Invalid Child Assignment", False, f"Invalid child assignment test failed: {str(e)}")
    
    # ==================== MAIN TEST RUNNER ====================
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("Starting comprehensive backend API tests...")
        self.log(f"Testing against: {self.base_url}")
        
        # Authentication Tests
        self.test_user_registration()
        self.test_user_login()
        self.test_get_me()
        
        # Family Tests
        self.test_create_family()
        self.test_get_family()
        self.test_update_family()
        
        # Children Tests
        self.test_create_child()
        self.test_age_validation()
        self.test_get_children()
        self.test_get_single_child()
        self.test_update_child()
        
        # Chores Tests
        self.test_create_chores()
        self.test_frequency_validation()
        self.test_get_chores()
        self.test_get_chores_by_status()
        self.test_get_chores_for_child()
        
        # Chore Completion Flow Tests
        self.test_complete_chore()
        self.test_approve_chore()
        self.test_reject_chore()
        self.test_reset_chore()
        
        # Payments & Stats Tests
        self.test_get_payments()
        self.test_get_child_payments()
        self.test_get_child_stats()
        
        # Edge Cases and Validation
        self.test_unauthorized_access()
        self.test_invalid_child_assignment()
        
        # Final Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test results summary"""
        total = self.results["passed"] + self.results["failed"]
        success_rate = (self.results["passed"] / total * 100) if total > 0 else 0
        
        self.log("=" * 60)
        self.log("BACKEND API TEST RESULTS SUMMARY")
        self.log("=" * 60)
        self.log(f"Total Tests: {total}")
        self.log(f"Passed: {self.results['passed']} ✅")
        self.log(f"Failed: {self.results['failed']} ❌")
        self.log(f"Success Rate: {success_rate:.1f}%")
        self.log("=" * 60)
        
        if self.results["failed"] > 0:
            self.log("FAILED TESTS:")
            for test in self.results["tests"]:
                if not test["success"]:
                    self.log(f"❌ {test['name']}: {test['message']}")
        
        self.log("=" * 60)
        
        return self.results

if __name__ == "__main__":
    tester = APITester()
    results = tester.run_all_tests()