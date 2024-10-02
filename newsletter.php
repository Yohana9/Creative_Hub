<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Get the form data
    $email = filter_var($_POST['newsletterEmail'], FILTER_SANITIZE_EMAIL);
    
    // Your email address where the subscription notifications will be sent
    $to = 'yohanreta9@gmail.com'; // Replace with your actual email
    $subject = 'New Newsletter Subscription';
    
    // Email body content
    $message = "You have a new subscriber with the following email:\n\n" . $email;
    
    // Headers
    $headers = 'From: noreply@yourwebsite.com' . "\r\n" .
               'Reply-To: noreply@yourwebsite.com' . "\r\n" .
               'X-Mailer: PHP/' . phpversion();
    
    // Send the email
    if (mail($to, $subject, $message, $headers)) {
        echo "Subscription successful!";
    } else {
        echo "Subscription failed, please try again.";
    }
} else {
    // Redirect back to the homepage if accessed directly
    header("Location: index.html");
    exit();
}
?>
