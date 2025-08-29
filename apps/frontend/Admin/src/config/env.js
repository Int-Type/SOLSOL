// 환경별 API 설정
const getApiBaseUrl = () => {
  // 개발 환경에서는 localhost 사용
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8080/api'
  }
  
  // 배포 환경에서는 환경변수나 배포 도메인 사용
  return process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api'
}

const MODE = import.meta.env.MODE;

// VITE_API_BASE_URL 환경 변수가 있으면 그 값을 사용하고,
// 없으면 개발 환경에서는 'http://localhost:8080/api', 배포 환경에서는 '/api'를 사용합니다.
// 배포 환경에서 '/api'를 사용하면 현재 도메인에 대한 상대 경로로 API를 요청하게 되어
// 어떤 도메인에 배포되든 유연하게 API를 호출할 수 있습니다.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (MODE === 'development' ? 'http://localhost:8080/api' : '/api');

export { API_BASE_URL };

//export const API_BASE_URL = getApiBaseUrl()

// 기타 환경 설정들
export const ENV = {
    MODE,
  API_BASE_URL,
  // 향후 다른 설정들 추가 가능
}