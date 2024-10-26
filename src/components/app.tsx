'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FilmIcon, BookOpenIcon, SearchIcon, MoveVertical, DownloadIcon } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// YouTube Data APIのキーを環境変数から取得
const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY

interface Video {
  id: string
  title: string
  viewCount: string
  duration: string
  thumbnailUrl: string
}

const SortableItem = ({ id, video, isChecked, onCheck, onClick }: { id: string, video: Video, isChecked: boolean, onCheck: (id: string) => void, onClick: (url: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const [showThumbnail, setShowThumbnail] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <Checkbox
          checked={isChecked}
          onCheckedChange={() => onCheck(id)}
        />
      </TableCell>
      <TableCell className="cursor-move" {...attributes} {...listeners}>
        ⋮⋮
      </TableCell>
      <TableCell
        className="relative"
        onMouseEnter={() => setShowThumbnail(true)}
        onMouseLeave={() => setShowThumbnail(false)}
      >
        <button
          className="text-left hover:underline focus:outline-none"
          onClick={() => onClick(`https://www.youtube.com/watch?v=${video.id}`)}
        >
          {video.title}
        </button>
        {showThumbnail && (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="absolute z-10 w-64 h-auto shadow-lg rounded-md"
            style={{ top: '100%', left: '0' }}
          />
        )}
      </TableCell>
      <TableCell>{video.viewCount}</TableCell>
      <TableCell>{video.duration}</TableCell>
    </TableRow>
  )
}

export function App() {
  const [keyword, setKeyword] = useState('')
  const [videos, setVideos] = useState<Video[]>([])
  const [checkedVideos, setCheckedVideos] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const searchVideos = useCallback(async () => {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${keyword}&type=video&key=${API_KEY}&maxResults=50`)
    const data = await response.json()
    const videoIds = data.items.map((item: any) => item.id.videoId).join(',')
    const statsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds}&key=${API_KEY}`)
    const statsData = await statsResponse.json()

    const videoList = data.items
      .filter((item: any) => /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(item.snippet.title))
      .map((item: any, index: number) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        viewCount: statsData.items[index]?.statistics.viewCount || '0',
        duration: statsData.items[index]?.contentDetails.duration.replace('PT', '').replace('H', ':').replace('M', ':').replace('S', '') || '0:00',
        thumbnailUrl: item.snippet.thumbnails.medium.url,
      }))
      .sort((a: Video, b: Video) => parseInt(b.viewCount) - parseInt(a.viewCount))

    setVideos(videoList)
  }, [keyword])

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setVideos((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleCheck = (id: string) => {
    setCheckedVideos((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
    setSelectAll(checkedVideos.size + 1 === videos.length)
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    if (checked) {
      setCheckedVideos(new Set(videos.map(v => v.id)))
    } else {
      setCheckedVideos(new Set())
    }
  }

  const handleDownload = () => {
    const selectedVideos = videos.filter((video) => checkedVideos.has(video.id))
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${keyword} 動画マニュアル</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; background-color: #EBF8FF; color: #2C5282; }
    h1 { color: #2B6CB0; text-align: center; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; background-color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #E2E8F0; }
    th { background-color: #4299E1; color: white; }
    tr:hover { background-color: #EBF8FF; }
    a { color: #3182CE; text-decoration: none; font-weight: bold; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>${keyword} 動画マニュアル</h1>
  <table>
    <thead>
      <tr>
        <th>タイトル</th>
        <th>視聴回数</th>
        <th>再生時間</th>
      </tr>
    </thead>
    <tbody>
      ${selectedVideos.map((video) => `
        <tr>
          <td><a href="https://www.youtube.com/watch?v=${video.id}" target="_blank">${video.title}</a></td>
          <td>${video.viewCount}</td>
          <td>${video.duration}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${keyword}動画マニュアル.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto p-4 bg-blue-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center text-blue-800 mb-4 flex items-center justify-center">
        <FilmIcon className="mr-2" />
        動画マニュアル作成ツール
        <BookOpenIcon className="ml-2" />
      </h1>
      <div className="mb-6 text-left bg-white p-6 rounded-lg shadow-md border border-blue-200">
        <h2 className="text-xl font-bold text-blue-800 mb-3">使い方</h2>
        <ul className="space-y-2">
          <li className="flex items-center">
            <SearchIcon className="w-5 h-5 mr-2 text-blue-500" />
            <span>キーワードに関連したYoutube動画を検索します。</span>
          </li>
          <li className="flex items-center">
            <MoveVertical className="w-5 h-5 mr-2 text-blue-500" />
            <span>検索された動画一覧はドラッグ＆ドロップで順番を変更できます。</span>
          </li>
          <li className="flex items-center">
            <DownloadIcon className="w-5 h-5 mr-2 text-blue-500" />
            <span>チェックボックスで選択した動画一覧をHTML形式でダウンロードできます。</span>
          </li>
        </ul>
      </div>
      <div className="flex mb-4">
        <Input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchVideos()}
          placeholder="キーワードを入力"
          className="flex-grow mr-2"
        />
        <Button onClick={searchVideos} className="bg-blue-600 hover:bg-blue-700">
          <SearchIcon className="mr-2" />
          検索
        </Button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[50px]">並べ替え</TableHead>
              <TableHead>タイトル</TableHead>
              <TableHead>視聴回数</TableHead>
              <TableHead>再生時間</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SortableContext items={videos.map(v => v.id)} strategy={verticalListSortingStrategy}>
              {videos.map((video) => (
                <SortableItem
                  key={video.id}
                  id={video.id}
                  video={video}
                  isChecked={checkedVideos.has(video.id)}
                  onCheck={handleCheck}
                  onClick={(url) => window.open(url, '_blank')}
                />
              ))}
            </SortableContext>
          </TableBody>
        </Table>
      </DndContext>
      {videos.length > 0 && (
        <div className="mt-4 text-center">
          <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700">
            選択した動画をHTMLでダウンロード
          </Button>
        </div>
      )}
    </div>
  )
}