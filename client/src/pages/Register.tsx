@@ .. @@
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsLoading(true);
     setError('');

     try {
-      const response = await authAPI.register({
+      const response = await fetch('http://localhost:5000/api/auth/register', {
+        method: 'POST',
+        headers: {
+          'Content-Type': 'application/json',
+        },
+        body: JSON.stringify({
+          username: formData.username,
+          email: formData.email,
+          password: formData.password,
+          firstName: formData.firstName,
+          lastName: formData.lastName,
+        }),
+      });
+
+      if (!response.ok) {
+        const errorData = await response.json();
+        throw new Error(errorData.message || 'Registration failed');
+      }
+
+      const userData = await response.json();
+      
+      // Store user data
+      localStorage.setItem('user', JSON.stringify(userData));
+      
+      // Redirect to dashboard
+      navigate('/');
+      
+      toast({
+        title: "Registration Successful",
+        description: "Welcome to HealthHubPro!",
+      });
+    } catch (error: any) {
+      console.error('Registration error:', error);
+      setError(error.message || 'Registration failed. Please try again.');
+      
+      toast({
+        title: "Registration Failed",
+        description: error.message || 'Please check your information and try again.',
+        variant: "destructive",
+      });
+    } finally {
+      setIsLoading(false);
+    }
+  };