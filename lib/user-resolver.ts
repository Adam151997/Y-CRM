import { clerkClient } from "@clerk/nextjs/server";

/**
 * Resolve a user by name, email, or "me" reference
 * Optimized: Single API call using publicUserData from memberships
 * 
 * @param orgId - The organization ID
 * @param query - User identifier: name ("Mike"), email ("mike@company.com"), or self-reference ("me", "myself")
 * @param currentUserId - The current user's ID (for resolving "me")
 * @returns User ID and name, or null if not found
 */
export async function resolveUser(
  orgId: string,
  query: string,
  currentUserId: string
): Promise<{ id: string; name: string } | null> {
  const lowerQuery = query.toLowerCase().trim();

  // 1. Handle "Me" / "Myself" / "I" / "Self"
  const selfTerms = ["me", "myself", "i", "self"];
  if (selfTerms.includes(lowerQuery)) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(currentUserId);
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
      return { id: currentUserId, name: name || "You" };
    } catch (error) {
      console.error("[resolveUser] Error fetching current user:", error);
      return { id: currentUserId, name: "You" };
    }
  }

  // 2. Fetch Organization Members (Single API Call)
  try {
    const client = await clerkClient();
    const membershipList = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    });

    // 3. Search in Public Data (No extra API calls)
    for (const member of membershipList.data) {
      const data = member.publicUserData;
      if (!data || !data.userId) continue;

      const email = (data.identifier || "").toLowerCase();
      const firstName = (data.firstName || "").toLowerCase();
      const lastName = (data.lastName || "").toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();

      // Priority A: Exact Email Match
      if (email === lowerQuery) {
        const displayName = [data.firstName, data.lastName].filter(Boolean).join(" ") || email;
        return { id: data.userId, name: displayName };
      }

      // Priority B: Fuzzy Name Match (full name contains query, or first name exact match)
      if (fullName.includes(lowerQuery) || firstName === lowerQuery) {
        const displayName = [data.firstName, data.lastName].filter(Boolean).join(" ") || "User";
        return { id: data.userId, name: displayName };
      }
    }

    // No match found
    return null;
  } catch (error) {
    console.error("[resolveUser] Error fetching org members:", error);
    return null;
  }
}
