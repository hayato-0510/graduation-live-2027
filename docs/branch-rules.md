# ブランチのルール

## ブランチとは

作業用の枝分かれコピーのこと。本線を直接触らず、枝（ブランチ）の中で変更して、できたら本線に戻す（マージする）。失敗しても枝を捨てれば本線は無傷、というための仕組み。

## このリポジトリのブランチ構成

- **main**: 本番用。本番サイトは main の中身そのもの。ここに入るのは dev からの昇格 PR だけ
- **dev**: 作業の合流先（常設）。普段の PR は全部 dev 宛て。dev の中身は dev 専用のプレビュー URL（https://dev.graduation-live-2027.pages.dev/）でいつでも確認できる
- **作業ブランチ**: 1つの作業ごとに dev から切る一時的なブランチ

main と dev はどちらもブランチ保護がかかっていて、直接 push はできない（やろうとしても弾かれる）。

## 決まり

- 作業は必ず dev からブランチを切って始める
- 1ブランチ = 1つの目的。「ついでにあれもこれも」を混ぜない。PR が小さくなるし、問題が起きた時に戻しやすい
- ブランチは長生きさせない。日をまたぐと dev が進んでいて、取り込む手間と衝突が増える。終わったら早めに PR を出す

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
git checkout dev
git pull
git checkout -b feature/timetable-search
```

## dev が進んでいたら

PR を出した後に dev が更新されると、そのままではマージできないことがある。その時は PR のページで「Update branch」を押す（dev の最新を自分のブランチに取り込む）。CI がもう一度回って、緑になればマージできる。

自分の PC で取り込む場合は:

```bash
git checkout <自分のブランチ>
git merge dev
git push
```

## マージと後片付け

- マージは PR のページから Merge commit で行う（履歴がそのまま残る形）。PR の宛先は dev（GitHub の初期設定も dev になっている）
- マージされた作業ブランチは削除してよい。自分の PC に残った古いブランチは `git branch -d <名前>` で消す
- dev と main は常設なので消さない
- 本番へ出す時は、dev → main の PR（昇格 PR）を別に作る。手順は [workflow.md](workflow.md) の「8. 本番へ出す」
- やり直したい変更は、無理に直すより Revert（打ち消しの PR）を使う。流れは [operations.md](operations.md)
