---
title: Shipping image datasets off a Mac without the junk
date: 2026-10-08
description: A small tar toolkit for moving image datasets off a Mac without .DS_Store and ._ files tagging along.
---
Every now and then I need to move a big image dataset around. Upload it to a GPU box, pull it back down, hand it to someone else, etc. Computer vision work is like that: a folder with tens of thousands of JPEGs and PNGs, and a dataloader on the other end that streams them into a model.

Now, I *could* just tell the dataloader to only pick up image files. Filter on the extension, done. But I'll be honest: I have a slight OCD streak, and I want the folder itself to be clean. Images in, images out, nothing else. No `.DS_Store`, no `._something.jpg` ghosts that look like an image to a careless glob and then blow up when something tries to decode them.

I work on a Mac, so `tar` is my tool of choice for these one-off migrations. Here's the little toolkit I ended up with.

## The junk we're talking about

Two kinds of files tend to tag along when a folder has lived on a Mac:

- **`.DS_Store`**: Finder's little notebook about how you like the folder to look. Icon positions, view settings. Useless to everyone else.
- **`._filename`**: so-called AppleDouble files. Each one carries the extended attributes of the real file next to it. So `cat_0001.jpg` gets a buddy called `._cat_0001.jpg`, which is *not* a JPEG, but sure looks like one to a `*.jpg` glob. macOS creates these when it copies files to places that can't store Mac metadata natively, like a USB stick, an exFAT drive or a network share. And, as I found out the hard way, macOS's own `tar` writes them into every archive you make with it.

## Step 1: see what you're dealing with

Before archiving anything, I like to know what's in there:

```shell
find dataset/ -name '._*' -o -name '.DS_Store'
```

And since my real goal is "only images", this one lists anything that is *not* an image. Note the `-name '.*'` part: it flags every file whose name starts with a dot, because `._cat_0001.jpg` ends in `.jpg` and would otherwise sail right through the extension check:

```shell
find dataset/ -type f \( -name '.*' -o ! \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) \)
```

No output from both? Lovely. On to packing.

## Step 2: pack it up, leaving the junk behind

Here's the thing that caught me out. I packed 52,210 PNG tiles with a plain `tar -czf`, unpacked them on a Linux box, and found 52,211 `._` files sitting next to them. One for every image, plus one for the folder.

That's because macOS's `tar` writes a `._` twin into the archive for every file that has extended attributes. And on a modern Mac that's basically every file: macOS stamps a `com.apple.provenance` attribute on files as they're created. Unpack that archive on another Mac and you'll never notice, because macOS's `tar` quietly turns the twins back into attributes. Unpack it on Linux and there they are, as real files.

So this is the command:

```shell
tar --no-mac-metadata --exclude='.DS_Store' --exclude='._*' -czf dataset.tar.gz dataset/
```

What's going on:

- `-c` creates an archive, `-z` gzips it, `-f dataset.tar.gz` names it.
- `--no-mac-metadata` stops `tar` from writing the `._` twins in the first place. This is the important one.
- `--exclude='.DS_Store'` skips Finder's files.
- `--exclude='._*'` skips any `._` files that are already sitting in the folder, from that USB stick for example. You need this one too: with `--no-mac-metadata`, `tar` treats `._` files on disk as ordinary files and packs them right in.

Note that `--exclude='._*'` on its own does nothing against the twins. They aren't files on disk, `tar` makes them up while it writes the archive, so there's nothing for the exclude to match.

You'll also see `COPYFILE_DISABLE=1` recommended all over the internet. On my Mac it does the same job as `--no-mac-metadata`:

```shell
COPYFILE_DISABLE=1 tar --exclude='.DS_Store' --exclude='._*' -czf dataset.tar.gz dataset/
```

Put `export COPYFILE_DISABLE=1` in your `~/.zshrc` and every `tar` you run is covered, even when you forget the flag.

## Step 3: trust, but verify

This is the part my OCD actually cares about, and it has a catch of its own: on a Mac, `tar -tzf` *hides* the `._` entries when it lists an archive. My 52,211-twin archive listed perfectly clean. So on a Mac, I let Python read the raw archive instead. It ships with the Xcode command line tools, and it hides nothing:

```shell
python3 -c "import tarfile,sys,os; bad=[m.name for m in tarfile.open(sys.argv[1]) if os.path.basename(m.name).startswith('._') or os.path.basename(m.name)=='.DS_Store']; print('\n'.join(bad) or 'squeaky clean')" dataset.tar.gz
```

It prints every `._` file and `.DS_Store` in the archive, at any depth. If there are none, you get a satisfying `squeaky clean`.

Want the "only images" guarantee for the archive too? Same idea:

```shell
python3 -c "import tarfile,sys,os,re; bad=[m.name for m in tarfile.open(sys.argv[1]) if m.isfile() and (os.path.basename(m.name).startswith('.') or not re.search(r'\.(jpe?g|png)$', m.name, re.I))]; print('\n'.join(bad) or 'only images')" dataset.tar.gz
```

This one prints any file that isn't a JPEG or PNG, and anything whose name starts with a dot, so a sneaky `._cat_0001.jpg` gets caught here too.

On Linux, plain `tar` doesn't hide anything, so a `grep` over the listing does the job there:

```shell
tar -tzf dataset.tar.gz | grep -E '(^|/)(\._|\.DS_Store$)' || echo "squeaky clean"
```

## Going the other way: downloading

When a dataset comes *to* me, or lands on a Linux box, the excludes work on extraction too. Junk that someone else packed in simply never lands on disk:

```shell
tar --exclude='.DS_Store' --exclude='._*' -xzf dataset.tar.gz
```

On a Linux machine, that's also the rescue for an archive that was packed without `--no-mac-metadata`: the twins are skipped, and only the real files land.

And if a folder is already polluted, find the strays first, look at the list, and only then delete them:

```shell
find dataset/ \( -name '._*' -o -name '.DS_Store' \) -print
find dataset/ \( -name '._*' -o -name '.DS_Store' \) -delete
```

(Always run the `-print` version first. `-delete` doesn't ask twice.)

## The cheat sheet

```shell
# What's in the folder that isn't an image?
find dataset/ -type f \( -name '.*' -o ! \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) \)

# Pack, without twins and without junk
tar --no-mac-metadata --exclude='.DS_Store' --exclude='._*' -czf dataset.tar.gz dataset/

# Check the archive (on a Mac, tar -t hides ._ entries, so ask Python)
python3 -c "import tarfile,sys,os; bad=[m.name for m in tarfile.open(sys.argv[1]) if os.path.basename(m.name).startswith('._') or os.path.basename(m.name)=='.DS_Store']; print('\n'.join(bad) or 'squeaky clean')" dataset.tar.gz

# Unpack, skipping the junk
tar --exclude='.DS_Store' --exclude='._*' -xzf dataset.tar.gz
```

That's it. The dataloader won't care either way, but my brain sleeps better knowing the folder is images and nothing but images.
