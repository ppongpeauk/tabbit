import * as Contacts from "expo-contacts";
import {
  hasContactsPermission,
  requestContactsPermission,
} from "./permissions";

export interface ContactInfo {
  name: string;
  phoneNumber?: string;
  email?: string;
  imageUri?: string;
}

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
      const imageUri =
        contact.image && "uri" in contact.image ? contact.image.uri : undefined;

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

export async function importContactsAsFriends(
  contacts: ContactInfo[]
): Promise<ContactInfo[]> {
  return contacts;
}

export async function getRecentContacts(): Promise<ContactInfo[]> {
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

export async function getFriendsList(): Promise<ContactInfo[]> {
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
