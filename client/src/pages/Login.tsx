@@ .. @@
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsLoading(true);
     setError('');

     try {
-      const response = await authAPI.login({
+      const response = await fetch('http://localhost:5000/api/auth/login', {
+        method: 'POST',
+        headers: {
+          'Content-Type': 'application/json',
+        },
+        body: JSON.stringify({
+          username: formData.username,
+          password: formData.password,
+        }),
+      });
+
+      if (!response.ok) {
+        const errorData = await response.json();
+        throw new Error(errorData.message || 'Login failed');
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
+        title: "Login Successful",
+        description: `Welcome back, ${userData.firstName}!`,
+      });
+    } catch (error: any) {
+      console.error('Login error:', error);
+      setError(error.message || 'Login failed. Please try again.');
+      
+      toast({
+        title: "Login Failed",
+        description: error.message || 'Please check your credentials and try again.',
+        variant: "destructive",
+      });
+    } finally {
+      setIsLoading(false);
+    }
+  };