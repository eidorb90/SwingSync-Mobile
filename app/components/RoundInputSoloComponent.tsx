import { View } from 'react-native'
import { Text } from 'react-native-paper'

type SoloInputProps = {
    userName: string
}

export default function RoundInputSoloComponent (props: SoloInputProps) {
    const { userName } = props
    return (
        <View>
            <Text>Round Input for just {userName}</Text>
        </View>
    )
}