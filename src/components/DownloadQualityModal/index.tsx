import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import Modal, { type DownloadQualityModalType as ModalType, type DownloadQualityModalProps as ModalProps, type SelectInfo } from './DownloadQualityModal'

export interface DownloadQualityModalProps {
  onAdded?: ModalProps['onAdded']
}
export interface DownloadQualityModalType {
  show: (info: SelectInfo) => void
}

export default forwardRef<DownloadQualityModalType, DownloadQualityModalProps>(({ onAdded }, ref) => {
  const modalRef = useRef<ModalType>(null)
  const [visible, setVisible] = useState(false)

  useImperativeHandle(ref, () => ({
    show(listInfo) {
      if (visible) modalRef.current?.show(listInfo)
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          modalRef.current?.show(listInfo)
        })
      }
    },
  }))

  return (
    visible
      ? <Modal ref={modalRef} onAdded={onAdded} />
      : null
  )
})
