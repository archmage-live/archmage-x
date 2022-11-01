import { CheckIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  HStack,
  Image,
  Menu,
  MenuButton,
  MenuGroup,
  MenuItem,
  MenuList,
  Portal,
  Text
} from '@chakra-ui/react'
import Avvvatars from 'avvvatars-react'
import { GrLinkBottom, GrLinkDown, GrLinkTop, GrLinkUp } from 'react-icons/gr'

import { Badge } from '~components/Badge'
import { INetwork } from '~lib/schema/network'
import { NetworkInfo, useNetworkLogoUrl } from '~lib/services/network'
import { MenuBtn } from '~pages/Popup/WalletDrawer/SubWalletItem'

interface NetworkItemProps {
  network: INetwork
  info: NetworkInfo
  selected?: boolean
  onSelected?: () => void
  reorder: (
    network: INetwork,
    placement: 'top' | 'up' | 'down' | 'bottom'
  ) => void
}

export const NetworkItem = ({
  network,
  info,
  selected,
  onSelected,
  reorder
}: NetworkItemProps) => {
  const networkLogoUrl = useNetworkLogoUrl(network)

  return (
    <Button
      key={network.id}
      variant="ghost"
      size="lg"
      w="full"
      h={16}
      px={4}
      justifyContent="start"
      onClick={onSelected}>
      <HStack w="full">
        <Image
          borderRadius="full"
          boxSize="24px"
          fit="cover"
          src={networkLogoUrl}
          fallback={
            <Avvvatars
              value={info.name}
              displayValue={info.name ? info.name[0] : undefined}
              size={24}
            />
          }
          alt="Network Logo"
        />

        <Box w="calc(100% - 31px)">
          <HStack justify="space-between">
            {/* here zIndex solves the weird incomplete display issue of the last rendered item*/}
            <Text
              maxW="calc(100% - 50px)"
              fontSize="lg"
              noOfLines={1}
              display="block"
              zIndex={15000}>
              {info.name}
            </Text>

            <HStack>
              <Box onClick={(event) => event.stopPropagation()}>
                <Menu isLazy autoSelect={false} placement="left">
                  <MenuButton as={MenuBtn} />
                  <Portal>
                    <MenuList minW={32} zIndex={1500}>
                      <MenuGroup title={info.name}>
                        <MenuItem
                          icon={<CheckIcon />}
                          iconSpacing={2}
                          isDisabled={selected}
                          onClick={onSelected}>
                          Select
                        </MenuItem>
                        <MenuItem
                          icon={<GrLinkTop />}
                          iconSpacing={2}
                          onClick={() => reorder(network, 'top')}>
                          Top
                        </MenuItem>
                        <MenuItem
                          icon={<GrLinkUp />}
                          iconSpacing={2}
                          onClick={() => reorder(network, 'up')}>
                          Up
                        </MenuItem>
                        <MenuItem
                          icon={<GrLinkDown />}
                          iconSpacing={2}
                          onClick={() => reorder(network, 'down')}>
                          Down
                        </MenuItem>
                        <MenuItem
                          icon={<GrLinkBottom />}
                          iconSpacing={2}
                          onClick={() => reorder(network, 'bottom')}>
                          Bottom
                        </MenuItem>
                      </MenuGroup>
                    </MenuList>
                  </Portal>
                </Menu>
              </Box>

              <CheckIcon
                visibility={selected ? 'visible' : 'hidden'}
                fontSize="lg"
                color="green.500"
              />
            </HStack>
          </HStack>

          {info.isTestnet && (
            <HStack>
              <Badge>TESTNET</Badge>
            </HStack>
          )}
        </Box>
      </HStack>
    </Button>
  )
}
