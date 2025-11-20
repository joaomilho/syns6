"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import styles from "./UserMenu.module.css";

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  return (
    <div className={styles.userMenu}>
      <Link href="/profile" className={styles.avatarLink}>
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name || "User"}
            width={40}
            height={40}
            className={styles.avatar}
          />
        ) : (
          <div className={styles.avatarPlaceholder}>
            {session.user.name?.charAt(0) || "U"}
          </div>
        )}
      </Link>
    </div>
  );
}

