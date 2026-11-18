import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { View } from 'react-native'
import Modal, { type ModalType } from '@/components/common/Modal'
import Image from '@/components/common/Image'
import { useWindowSize } from '@/utils/hooks'
import { createStyle } from '@/utils/tools'

export interface PicViewModalType {
  show: (pic: string) => void
}

/**
 * 全屏查看封面大图，点击任意位置或按返回键关闭
 */
export default forwardRef<PicViewModalType, {}>((props, ref) => {
  const modalRef = useRef<ModalType>(null)
  const [pic, setPic] = useState<string | null>(null)
  const { width, height } = useWindowSize()
  const size = Math.min(width, height) * 0.96

  useImperativeHandle(ref, () => ({
    show(newPic) {
      setPic(newPic)
      modalRef.current?.setVisible(true)
    },
  }))

  return (
    <Modal ref={modalRef} bgColor="rgba(0,0,0,0.92)" statusBarPadding={false}>
      <View style={styles.container}>
        {pic ? <Image url={pic} style={{ width: size, height: size }} resizeMode="contain" /> : null}
      </View>
    </Modal>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
