import { EmailIcon } from '@chakra-ui/icons'
import { Divider, HStack, Icon, Image, Text } from '@chakra-ui/react'
import { FaSms } from '@react-icons/all-files/fa/FaSms'
import appleLogo from 'data-base64:~assets/thirdparty/login-apple-active.svg'
import discordLogo from 'data-base64:~assets/thirdparty/login-discord-active.svg'
import facebookLogo from 'data-base64:~assets/thirdparty/login-facebook-active.svg'
import githubLogo from 'data-base64:~assets/thirdparty/login-github-active.svg'
import googleLogo from 'data-base64:~assets/thirdparty/login-google-active.svg'
import kakaoLogo from 'data-base64:~assets/thirdparty/login-kakao-active.svg'
import lineLogo from 'data-base64:~assets/thirdparty/login-line-active.svg'
import linkedinLogo from 'data-base64:~assets/thirdparty/login-linkedin-active.svg'
import redditLogo from 'data-base64:~assets/thirdparty/login-reddit-active.svg'
import twitchLogo from 'data-base64:~assets/thirdparty/login-twitch-active.svg'
import twitterLogo from 'data-base64:~assets/thirdparty/login-twitter-active.svg'
import wechatLogo from 'data-base64:~assets/thirdparty/login-wechat-active.svg'
import weiboLogo from 'data-base64:~assets/thirdparty/login-weibo-active.svg'

import {
  WEB3AUTH_LOGIN_PROVIDER,
  WEB3AUTH_LOGIN_PROVIDER_TYPE
} from '~lib/keyless/web3auth'
import { KeylessWalletInfo, KeylessWalletType } from '~lib/wallet'

export const OnboardKeylessInfo = ({ info }: { info: KeylessWalletInfo }) => {
  const LoginProviderLogo = () => {
    switch (info.loginProvider as WEB3AUTH_LOGIN_PROVIDER_TYPE) {
      case WEB3AUTH_LOGIN_PROVIDER.GOOGLE:
        return <Image w={8} fit="cover" src={googleLogo} alt="google Logo" />
      case WEB3AUTH_LOGIN_PROVIDER.FACEBOOK:
        return (
          <Image w={8} fit="cover" src={facebookLogo} alt="facebook Logo" />
        )
      case WEB3AUTH_LOGIN_PROVIDER.REDDIT:
        return <Image w={8} fit="cover" src={redditLogo} alt="reddit Logo" />
      case WEB3AUTH_LOGIN_PROVIDER.DISCORD:
        return <Image w={8} fit="cover" src={discordLogo} alt="discord Logo" />
      case WEB3AUTH_LOGIN_PROVIDER.TWITCH:
        return <Image w={8} fit="cover" src={twitchLogo} alt="twitch Logo" />
      case WEB3AUTH_LOGIN_PROVIDER.APPLE:
        return <Image w={8} fit="cover" src={appleLogo} alt="apple Logo" />
      case WEB3AUTH_LOGIN_PROVIDER.LINE:
        return <Image w={8} fit="cover" src={lineLogo} alt="line Logo" />
      case WEB3AUTH_LOGIN_PROVIDER.GITHUB:
        return <Image w={8} fit="cover" src={githubLogo} alt="github Logo" />
      case WEB3AUTH_LOGIN_PROVIDER.KAKAO:
        return <Image w={8} fit="cover" src={kakaoLogo} alt="kakao Logo" />
      case WEB3AUTH_LOGIN_PROVIDER.LINKEDIN:
        return (
          <Image w={8} fit="cover" src={linkedinLogo} alt="linkedin Logo" />
        )
      case WEB3AUTH_LOGIN_PROVIDER.TWITTER:
        return <Image w={8} fit="cover" src={twitterLogo} alt="twitter Logo" />
      case WEB3AUTH_LOGIN_PROVIDER.WEIBO:
        return <Image w={8} fit="cover" src={weiboLogo} alt="weibo Logo" />
      case WEB3AUTH_LOGIN_PROVIDER.WECHAT:
        return <Image w={8} fit="cover" src={wechatLogo} alt="wechat Logo" />
      case WEB3AUTH_LOGIN_PROVIDER.EMAIL_PASSWORDLESS:
        return <EmailIcon boxSize={8} color="orange.500" />
      case WEB3AUTH_LOGIN_PROVIDER.SMS_PASSWORDLESS:
        return <Icon as={FaSms} fontSize="3xl" />
      case WEB3AUTH_LOGIN_PROVIDER.WEBAUTHN:
        return <Text fontWeight="medium">WebAuthn</Text>
      case WEB3AUTH_LOGIN_PROVIDER.JWT:
        return <Text fontWeight="medium">JWT</Text>
      default:
        return <></>
    }
  }

  return (
    <HStack h={8} spacing={4} justify="end">
      <LoginProviderLogo />

      <Divider orientation="vertical" />

      <HStack spacing={2}>
        {info.imageUrl && (
          <Image
            w={8}
            fit="cover"
            src={info.imageUrl}
            alt="user profile image"
          />
        )}
        <Text fontWeight="medium">{info.name}</Text>
      </HStack>
    </HStack>
  )
}
