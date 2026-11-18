import { useRef } from 'react'
import PlayQueuePopup, { type PlayQueuePopupType } from '@/components/PlayQueuePopup'
import Btn from './Btn'


export default () => {
  const popupRef = useRef<PlayQueuePopupType>(null)

  return (
    <>
      <Btn icon="play-queue" onPress={() => popupRef.current?.show()} />
      <PlayQueuePopup ref={popupRef} />
    </>
  )
}
