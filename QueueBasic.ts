import { Message } from "./Database";

export class Queue {
    private messages: Message[] = [];
    private processedMessageIds = new Set<string>();
    private keyProcessingLocks = new Map<string, boolean>();
    private messageKeyMap = new Map<string, string>();

    Enqueue = (message: Message) => {
        this.messages.push(message);
    };

    Dequeue = (workerId: number): Message | undefined => {
            for (let i = 0; i < this.messages.length; i++) {
                const msg = this.messages[i];

                if (this.processedMessageIds.has(msg.id)) continue;
                if (this.keyProcessingLocks.get(msg.key)) continue;

                this.keyProcessingLocks.set(msg.key, true);
                this.messageKeyMap.set(msg.id, msg.key);
                this.messages.splice(i, 1);
                return msg;
            }
    };

    Confirm = (workerId: number, messageId: string) => {
            const key = this.messageKeyMap.get(messageId);
            if (key) {
                this.keyProcessingLocks.delete(key);
                this.messageKeyMap.delete(messageId);
            }
            this.processedMessageIds.add(messageId);
    };

    Size = () => this.messages.length;
}