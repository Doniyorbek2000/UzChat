import { MessageType } from "@prisma/client";
import { prisma } from "../../config/prisma";

/**
 * Creates a GROUP service message (e.g. "X added Y to the group") with the
 * given pre-rendered Uzbek `text` stored as plaintext in `ciphertext` - these
 * messages carry no user content, only membership/settings metadata that's
 * already visible to the server via the participants table.
 */
export async function createSystemMessage(conversationId: string, actorId: string, text: string) {
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: actorId,
      type: MessageType.SYSTEM,
      ciphertext: text,
      nonce: "",
    },
  });
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

  return { ...message, reactions: [], pollVotes: [], isStarred: false };
}
