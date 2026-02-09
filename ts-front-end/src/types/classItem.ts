export interface ClassItem {
    name: string;
    section: string;
    room: string;
    day: number; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    startTime: number; // hour in 24h format (8-22)
    endTime: number; // hour in 24h format (8-22)
}