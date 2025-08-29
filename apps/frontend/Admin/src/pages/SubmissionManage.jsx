import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import StatCards from '../components/StatCards'
import FilterTabs from '../components/FilterTabs'
import DocTable from '../components/DocTable'
import { api } from '../utils/api'
import './submission.css'

export default function SubmissionManage(){
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [stats, setStats] = useState([
    { label: '등록 서류', value: 0 },
    { label: '검토 대기', value: 0 },
    { label: '승인 완료', value: 0 },
    { label: '반려', value: 0 },
  ])

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      const result = await api.get('/applications')
      if (result.success) {
        const applicationsData = result.data || []
        setApplications(applicationsData)
        calculateStats(applicationsData)
      } else {
        // API 성공했지만 데이터가 없는 경우
        setApplications([])
        calculateStats([])
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
      // 데이터가 없는 경우와 실제 에러를 구분
      if (error.message?.includes('500') || error.message?.includes('서버 내부 오류')) {
        // 서버 에러인 경우 빈 배열로 처리 (아무것도 없는 경우)
        setApplications([])
        calculateStats([])
        console.log('No applications available yet')
      } else {
        alert('신청서 목록을 불러오는데 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data) => {
    const total = data.length
    const pending = data.filter(app => app.applicationState === 'PENDING' || app.state === 'PENDING').length
    const approved = data.filter(app => app.applicationState === 'APPROVED' || app.state === 'APPROVED').length
    const rejected = data.filter(app => app.applicationState === 'REJECTED' || app.state === 'REJECTED').length

    setStats([
      { label: '등록 서류', value: total },
      { label: '검토 대기', value: pending },
      { label: '승인 완료', value: approved },
      { label: '반려', value: rejected },
    ])
  }

  const handleApproval = async (userNm, scholarshipNm, action) => {
    try {
      if (action === 'approve') {
        await api.put(`/applications/${userNm}/${scholarshipNm}/approve`, {
          reviewComment: '승인되었습니다.'
        })
      } else {
        await api.put(`/applications/${userNm}/${scholarshipNm}/reject`, {
          reviewComment: '검토 결과 반려되었습니다.'
        })
      }
      
      alert(`신청서가 ${action === 'approve' ? '승인' : '반려'}되었습니다.`)
      fetchApplications()
    } catch (error) {
      console.error(`Failed to ${action} application:`, error)
      alert(`신청서 ${action === 'approve' ? '승인' : '반려'}에 실패했습니다.`)
    }
  }

  const handleViewFile = async (doc) => {
    try {
      // 파일 URL이 S3 presigned URL인 경우 직접 새 창에서 열기
      if (doc.fileUrl) {
        window.open(doc.fileUrl, '_blank')
      } else {
        alert('파일을 불러올 수 없습니다.')
      }
    } catch (error) {
      console.error('Failed to view file:', error)
      alert('파일 보기 중 오류가 발생했습니다.')
    }
  }

  const handleDownloadFile = async (doc) => {
    try {
      if (doc.fileUrl) {
        // 파일 다운로드
        const link = document.createElement('a')
        link.href = doc.fileUrl
        link.download = doc.originalFileName || `document_${doc.applicationDocumentNm}`
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        alert('파일을 다운로드할 수 없습니다.')
      }
    } catch (error) {
      console.error('Failed to download file:', error)
      alert('파일 다운로드 중 오류가 발생했습니다.')
    }
  }

  const transformApplicationData = (application) => ({
    id: `${application.userNm}-${application.scholarshipNm}`,
    scholarship: application.scholarshipName || '장학금명 없음',
    unit: application.departmentName ? `${application.departmentName} - ${application.collegeName || ''}` : '학과정보 없음',
    files: application.documents?.map(doc => doc.documentName) || [],
    applicant: application.userName || '신청자명 없음',
    studentId: `${application.userNm} - ${application.departmentName || '학과정보 없음'}`,
    time: new Date(application.applicationDate || application.appliedAt).toLocaleString('ko-KR') || '-',
    status: application.applicationState === 'PENDING' || application.state === 'PENDING' ? '검토 대기' :
             application.applicationState === 'APPROVED' || application.state === 'APPROVED' ? '승인' : '반려',
    userNm: application.userNm,
    scholarshipNm: application.scholarshipNm,
    onApprove: () => handleApproval(application.userNm, application.scholarshipNm, 'approve'),
    onReject: () => handleApproval(application.userNm, application.scholarshipNm, 'reject')
  })

  const filteredApplications = applications.filter(app => {
    const matchesSearch = !searchQuery || 
      app.scholarshipName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.userName?.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (activeTab === 'all') return matchesSearch
    if (activeTab === 'pending') return matchesSearch && (app.applicationState === 'PENDING' || app.state === 'PENDING')
    if (activeTab === 'approved') return matchesSearch && (app.applicationState === 'APPROVED' || app.state === 'APPROVED')
    if (activeTab === 'rejected') return matchesSearch && (app.applicationState === 'REJECTED' || app.state === 'REJECTED')
    
    return matchesSearch
  })

  const tabs = [
    { key:'all', label:`전체 (${applications.length})`, active: activeTab === 'all' },
    { key:'pending', label:`검토 대기 (${stats[1].value})`, active: activeTab === 'pending' },
    { key:'approved', label:`승인 (${stats[2].value})`, active: activeTab === 'approved' },
    { key:'rejected', label:`반려 (${stats[3].value})`, active: activeTab === 'rejected' },
  ]

  const handleSearch = () => {
    // 검색 로직은 이미 filteredApplications에서 처리됨
  }

  const handleViewDetails = async (application) => {
    try {
      const result = await api.get(`/applications/${application.userNm}/${application.scholarshipNm}`)
      setSelectedApplication(result)
      setShowDetailModal(true)
    } catch (error) {
      console.error('Failed to fetch application details:', error)
      alert('상세 정보를 불러오는데 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <>
        <Navbar/>
        <div className="admin-layout">
          <Sidebar/>
          <main className="admin-main">
            <div style={{textAlign: 'center', padding: '50px'}}>
              로딩 중...
            </div>
          </main>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar/>
      <div className="admin-layout">
        <Sidebar/>
        <main className="admin-main">
          {/* 상단 우측 검색 */}
          <div className="topbar">
            <input 
              className="search" 
              placeholder="장학금명으로 검색" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="search-btn" onClick={handleSearch}>검색</button>
          </div>

          {/* 요약 카드 */}
          <StatCards items={stats}/>

          {/* 탭 */}
          <FilterTabs 
            items={tabs}
            onTabChange={(tabKey) => setActiveTab(tabKey)}
          />

          {/* 테이블 */}
          <DocTable 
            rows={filteredApplications.map(transformApplicationData)}
            onViewDetails={handleViewDetails}
          />
        </main>
      </div>

      {/* 상세보기 모달 */}
      {showDetailModal && selectedApplication && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>신청서 상세 정보</h3>
              <button className="close-btn" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h4>장학금 정보</h4>
                <p><strong>장학금명:</strong> {selectedApplication.scholarshipName || '정보 없음'}</p>
                <p><strong>장학금 ID:</strong> {selectedApplication.scholarshipNm}</p>
              </div>
              
              <div className="detail-section">
                <h4>신청자 정보</h4>
                <p><strong>이름:</strong> {selectedApplication.userName || '정보 없음'}</p>
                <p><strong>학번:</strong> {selectedApplication.userNm}</p>
                <p><strong>학과:</strong> {selectedApplication.departmentName || '정보 없음'}</p>
                <p><strong>단과대:</strong> {selectedApplication.collegeName || '정보 없음'}</p>
                <p><strong>대학교:</strong> {selectedApplication.universityName || '정보 없음'}</p>
              </div>
              
              <div className="detail-section">
                <h4>신청 정보</h4>
                <p><strong>신청일시:</strong> {new Date(selectedApplication.appliedAt).toLocaleString('ko-KR')}</p>
                <p><strong>상태:</strong> 
                  <span className={`status-badge ${selectedApplication.state?.toLowerCase()}`}>
                    {selectedApplication.state === 'PENDING' ? '검토 대기' :
                     selectedApplication.state === 'APPROVED' ? '승인' : '반려'}
                  </span>
                </p>
                {selectedApplication.reason && (
                  <p><strong>사유/메모:</strong> {selectedApplication.reason}</p>
                )}
              </div>

              {selectedApplication.documents && selectedApplication.documents.length > 0 && (
                <div className="detail-section">
                  <h4>제출 서류</h4>
                  <div className="documents-list">
                    {selectedApplication.documents.map((doc, index) => (
                      <div key={index} className="document-item">
                        <span className="doc-icon">📄</span>
                        <div className="doc-info">
                          <p><strong>{doc.originalFileName || doc.applicationDocumentNm}</strong></p>
                          <p className="doc-details">
                            {doc.formattedFileSize || '크기 정보 없음'} • {doc.contentType || '파일 타입 불명'}
                          </p>
                          <p className="doc-date">
                            업로드: {new Date(doc.uploadedAt).toLocaleString('ko-KR')}
                          </p>
                        </div>
                        <div className="doc-actions">
                          <button 
                            className="btn-view" 
                            onClick={() => handleViewFile(doc)}
                            title="파일 보기"
                          >
                            👁️ 보기
                          </button>
                          <button 
                            className="btn-download" 
                            onClick={() => handleDownloadFile(doc)}
                            title="파일 다운로드"
                          >
                            💾 다운로드
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {selectedApplication.state === 'PENDING' && (
              <div className="modal-footer">
                <button 
                  className="approve-btn-modal"
                  onClick={() => {
                    handleApproval(selectedApplication.userNm, selectedApplication.scholarshipNm, 'approve')
                    setShowDetailModal(false)
                  }}
                >
                  승인
                </button>
                <button 
                  className="reject-btn-modal"
                  onClick={() => {
                    handleApproval(selectedApplication.userNm, selectedApplication.scholarshipNm, 'reject')
                    setShowDetailModal(false)
                  }}
                >
                  반려
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
