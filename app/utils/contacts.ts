import * as Contacts from "expo-contacts";

export interface ContactInfo {
  name: string;
  phoneNumber?: string;
  email?: string;
  imageUri?: string;
}

/**
 * Request contacts permission
 */
export async function requestContactsPermission(): Promise<boolean> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Error requesting contacts permission:", error);
    return false;
  }
}

/**
 * Check if contacts permission is granted
 */
export async function hasContactsPermission(): Promise<boolean> {
  try {
    const { status } = await Contacts.getPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Error checking contacts permission:", error);
    return false;
  }
}

/**
 * Fetch contacts from device
 */
export async function fetchContacts(): Promise<ContactInfo[]> {
  const hasPermission = await hasContactsPermission();
  if (!hasPermission) {
    const granted = await requestContactsPermission();
    if (!granted) {
      throw new Error("Contacts permission denied");
    }
  }

  try {
    const { data } = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Emails,
        Contacts.Fields.Image,
      ],
    });

    return data.map((contact) => {
      const phoneNumber =
        contact.phoneNumbers && contact.phoneNumbers.length > 0
          ? contact.phoneNumbers[0].number
          : undefined;
      const email =
        contact.emails && contact.emails.length > 0
          ? contact.emails[0].email
          : undefined;
      const imageUri = contact.imageUri || undefined;

      return {
        name: contact.name || "Unknown",
        phoneNumber,
        email,
        imageUri,
      };
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to fetch contacts from device"
    );
  }
}

/**
 * Import selected contacts as friends
 */
export async function importContactsAsFriends(
  contacts: ContactInfo[]
): Promise<ContactInfo[]> {
  // This function just returns the contacts - the actual import
  // will be handled by the friends screen component
  return contacts;
}

/**
 * Get recent contacts (fake data for now)
 */
export async function getRecentContacts(): Promise<ContactInfo[]> {
  // TODO: Connect to actual recent contacts data
  return [
    {
      name: "John Doe",
      phoneNumber: "+1234567890",
      email: "john.doe@example.com",
    },
    {
      name: "Jane Smith",
      phoneNumber: "+1987654321",
      email: "jane.smith@example.com",
    },
    {
      name: "Bob Johnson",
      phoneNumber: "+1555555555",
    },
  ];
}

/**
 * Get friends list (fake data for now)
 */
export async function getFriendsList(): Promise<ContactInfo[]> {
  // TODO: Connect to actual friends data
  return [
    {
      name: "Alice Williams",
      phoneNumber: "+1111111111",
      email: "alice@example.com",
    },
    {
      name: "Charlie Brown",
      phoneNumber: "+1222222222",
      email: "charlie@example.com",
    },
    {
      name: "Diana Prince",
      phoneNumber: "+1333333333",
    },
  ];
}
