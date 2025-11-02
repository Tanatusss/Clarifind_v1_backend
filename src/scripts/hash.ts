// scripts/hash.ts
import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error("❌ Usage: npx ts-node scripts/hash.ts <plainPassword>");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log("✅ Hashed password:\n" + hash);



// node -e "console.log(require('bcryptjs').hashSync('admin007', 10))

//npx ts-node scripts/hash.ts admin007