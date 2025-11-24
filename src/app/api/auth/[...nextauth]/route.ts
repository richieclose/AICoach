import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";

const handler = NextAuth({
    ...authOptions,
    debug: true, // Enable NextAuth debugging
});

export { handler as GET, handler as POST };
