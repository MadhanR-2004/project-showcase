// Generate a random password with specified length
export function generatePassword(length: number = 8): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  
  // Ensure at least one uppercase, one lowercase, and one number
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
  password += "0123456789"[Math.floor(Math.random() * 10)];
  
  // Fill the rest with random characters
  for (let i = 3; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Generate a more readable password (avoiding confusing characters)
export function generateReadablePassword(length: number = 8): string {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Exclude I, O
  const lowercase = "abcdefghijkmnpqrstuvwxyz"; // Exclude l, o
  const numbers = "23456789"; // Exclude 0, 1
  const allChars = uppercase + lowercase + numbers;
  
  let password = "";
  
  // Ensure at least one uppercase, one lowercase, and one number
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  
  // Fill the rest with random characters
  for (let i = 3; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
