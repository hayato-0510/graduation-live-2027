# ブランチのルール

## ブランチとは

作業用の枝分かれコピーのこと。本線（main）を直接触らず、枝（ブランチ）の中で変更して、できたら本線に戻す（マージする）。失敗しても枝を捨てれば本線は無傷、というための仕組み。

## このリポジトリの決まり

- **main が本線。** 本番サイトは main の中身そのもの。main への直接 push はブランチ保護で禁止されている（やろうとしても弾かれる）
- 作業は必ず main からブランチを切って始める
- 1ブランチ = 1つの目的。「ついでにあれもこれも」を混ぜない。PR が小さくなるし、問題が起きた時に戻しやすい
- ブランチは長生きさせない。日をまたぐと main が進んでいて、取り込む手間と衝突が増える。終わったら早めに PR を出す

## 名前の付け方

種類 + 内容を英語の小文字で、単語は `-` でつなぐ。

| 種類       | 使う時                         | 例                         |
| ---------- | ------------------------------ | -------------------------- |
| `feature/` | 新しい機能や見た目の追加       | `feature/timetable-search` |
| `fix/`     | おかしい所の修正               | `fix/hero-collapse`        |
| `data/`    | `src/data/` の JSON だけの変更 | `data/bands-update`        |
| `docs/`    | ドキュメントだけの変更         | `docs/dev-guide`           |
| `chore/`   | 設定や整備などの雑務           | `chore/repo-organization`  |

作り方:

```bash
git checkout main
git pull
git checkout -b feature/timetable-search
```

## main が進んでいたら

PR を出した後に main が更新されると、そのままではマージできないことがある。その時は PR のページで「Update branch」を押す（main の最新を自分のブランチに取り込む）。CI がもう一度回って、緑になればマージできる。

自分の PC で取り込む場合は:

```bash
git checkout <自分のブランチ>
git merge main
git push
```

## マージと後片付け

- マージは PR のページから Merge commit で行う（履歴がそのまま残る形）
- マージされたブランチは自動で削除される。自分の PC に残った古いブランチは `git branch -d <名前>` で消してよい
- やり直したい変更は、無理に直すより Revert（打ち消しの PR）を使う。流れは [operations.md](operations.md)
