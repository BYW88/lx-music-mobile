import Event from '@/event/Event'


class DownloadEvent extends Event {
  /**
   * 下载列表增删
   */
  listChanged() {
    this.emit('listChanged')
  }

  /**
   * 下载任务状态/进度更新
   */
  taskUpdated(tasks: LX.Download.ListItem[]) {
    this.emit('taskUpdated', tasks)
  }
}


type EventMethods = Omit<EventType, keyof Event>


declare class EventType extends DownloadEvent {
  on<K extends keyof EventMethods>(event: K, listener: EventMethods[K]): any
  off<K extends keyof EventMethods>(event: K, listener: EventMethods[K]): any
}

type DownloadEventTypes = Omit<EventType, keyof Omit<Event, 'on' | 'off'>>


export const event: DownloadEventTypes = new DownloadEvent()
