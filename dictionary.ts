/** Hand-reviewed base strings. Keys are original BB interface text, never command IDs. */
export const DICTIONARY: Record<string, string> = {
  'Save': 'Сохранить', 'Cancel': 'Отмена', 'Close': 'Закрыть', 'Back': 'Назад',
  'Next': 'Далее', 'Done': 'Готово', 'Apply': 'Применить', 'Reset': 'Сбросить',
  'Delete': 'Удалить', 'Remove': 'Удалить', 'Edit': 'Изменить', 'Add': 'Добавить',
  'Create': 'Создать', 'Continue': 'Продолжить', 'Confirm': 'Подтвердить',
  'Enable': 'Включить', 'Disable': 'Отключить', 'Enabled': 'Включено',
  'Disabled': 'Отключено', 'Install': 'Установить', 'Installed': 'Установлено',
  'Uninstall': 'Удалить', 'Update': 'Обновить', 'Updates': 'Обновления',
  'Reload': 'Перезагрузить', 'Refresh': 'Обновить', 'Retry': 'Повторить',
  'Loading': 'Загрузка', 'Loading…': 'Загрузка…', 'Loading...': 'Загрузка…',
  'Loading thread': 'Загрузка диалога', 'Loading plugins…': 'Загрузка плагинов…',
  'Search': 'Поиск', 'Search...': 'Поиск…', 'Search plugins': 'Поиск плагинов',
  'Search plugins...': 'Поиск плагинов…', 'Search skills...': 'Поиск навыков…',
  'No results': 'Ничего не найдено', 'No results found': 'Ничего не найдено',
  'Settings': 'Настройки', 'Appearance': 'Оформление', 'General': 'Общие',
  'Advanced': 'Дополнительно', 'About': 'О программе', 'Language': 'Язык',
  'Home': 'Главная', 'Plugins': 'Плагины', 'Skills': 'Навыки', 'More': 'Ещё',
  'Browse': 'Обзор', 'Browse plugins': 'Каталог плагинов', 'Installed plugins': 'Установленные плагины',
  'New plugin': 'Новый плагин', 'New plugin options': 'Варианты нового плагина',
  'Plugin': 'Плагин', 'Built in': 'Встроен', 'Experimental': 'Экспериментальный',
  'New & notable': 'Новое и интересное', 'View all': 'Показать все',
  'Category': 'Категория', 'All categories': 'Все категории', 'Sort': 'Сортировка',
  'Default': 'По умолчанию', 'Newest': 'Сначала новые', 'Popular': 'Популярные',
  'Details': 'Подробнее', 'Description': 'Описание', 'Overview': 'Обзор',
  'Capabilities': 'Возможности', 'Configuration': 'Настройка',
  'Version': 'Версия', 'Source': 'Источник', 'Status': 'Состояние',
  'Running': 'Работает', 'Stopped': 'Остановлен', 'Error': 'Ошибка',
  'Connected': 'Подключено', 'Disconnected': 'Отключено', 'Connecting…': 'Подключение…',
  'New thread': 'Новый диалог', 'Thread actions': 'Действия с диалогом',
  'Thread working': 'Агент работает', 'Thread succeeded': 'Работа завершена',
  'Thread failed': 'Ошибка в диалоге', 'Unread thread succeeded': 'Есть непрочитанный результат',
  'Archive': 'В архив', 'Unarchive': 'Из архива', 'Rename': 'Переименовать',
  'Pin': 'Закрепить', 'Unpin': 'Открепить', 'Pinned': 'Закреплённые',
  'Threads': 'Диалоги', 'Projects': 'Проекты', 'Project': 'Проект',
  'No project': 'Без проекта', 'New project': 'Новый проект', 'Open project': 'Открыть проект',
  'Go back': 'Назад', 'Go forward': 'Вперёд', 'Toggle Sidebar': 'Показать или скрыть боковую панель',
  'Toggle sidebar': 'Показать или скрыть боковую панель',
  'Show right panel': 'Показать правую панель', 'Hide right panel': 'Скрыть правую панель',
  'Sidebar navigation': 'Навигация боковой панели',
  'Mobile apps': 'Мобильные приложения', 'Team usage': 'Использование командой',
  'Report a bug': 'Сообщить об ошибке', 'More footer actions': 'Другие действия',
  'Ask anything.': 'Напишите запрос.', 'Ask anything': 'Напишите запрос',
  'Enter a prompt or attach a file.': 'Напишите запрос или прикрепите файл.',
  'Prompt actions': 'Действия с запросом', 'Start voice input': 'Начать голосовой ввод',
  'Stop voice input': 'Остановить голосовой ввод', 'Send': 'Отправить', 'Stop': 'Остановить',
  'Permission mode': 'Режим разрешений', 'Approve for me': 'Автоматическая проверка',
  'Ask me': 'Спрашивать меня', 'Accept edits': 'Разрешать правки', 'Full access': 'Полный доступ',
  'Provider, model and reasoning': 'Провайдер, модель и глубина рассуждений',
  'Low': 'Низкая', 'Medium': 'Средняя', 'High': 'Высокая',
  'Reasoning': 'Глубина рассуждений', 'Model': 'Модель', 'Provider': 'Провайдер',
  'Copy': 'Копировать', 'Copied': 'Скопировано', 'Copy link': 'Копировать ссылку',
  'Open': 'Открыть', 'Open in browser': 'Открыть в браузере',
  'Notifications': 'Уведомления', 'AI services': 'Сервисы ИИ',
  'Machines': 'Компьютеры', 'Environments': 'Рабочие окружения',
  'Keyboard shortcuts': 'Сочетания клавиш', 'Shortcuts': 'Сочетания клавиш',
  'Dark': 'Тёмная', 'Light': 'Светлая', 'System': 'Системная', 'Theme': 'Тема',
  'Name': 'Название', 'Optional': 'Необязательно', 'Required': 'Обязательно',
  'Learn more': 'Подробнее', 'Documentation': 'Документация', 'Help': 'Помощь',
  'Providers': 'Провайдеры', 'Keyboard': 'Клавиатура', 'Files': 'Файлы',
  'Mobile': 'Мобильные устройства', 'Environment variables': 'Переменные окружения',
  'Plugin marketplaces': 'Каталоги плагинов', 'Experiments': 'Эксперименты',
  'Community': 'Сообщество', 'Archived': 'Архив', 'Archived threads': 'Архив диалогов',
  'Search settings': 'Поиск в настройках', 'Plugin details': 'Сведения о плагине',
  'Loading settings navigation': 'Загрузка навигации настроек',
  'No changes': 'Нет изменений', 'Changed files': 'Изменённые файлы',
  'Discover plugins for bb. Install one, or describe your own and build it from a prompt.':
    'Найдите плагины для bb. Установите готовый или опишите свой — агент создаст его по запросу.',
  'Turn bb into': 'Превратите bb в',
  'a video editor': 'видеоредактор', 'a kanban board': 'канбан-доску',
  'a live dashboard': 'панель показателей', 'a chief of staff': 'помощника руководителя',
  'a prototyping lab': 'лабораторию прототипов', 'a support inbox': 'центр поддержки',
  'What you can build with bb plugins': 'Что можно создать с помощью плагинов bb',
  'Todo': 'К выполнению', 'In progress': 'В работе', 'Review': 'Проверка',
  'Deploys': 'Выпуски', 'Open PRs': 'Открытые PR', 'CI pass': 'Успешные проверки CI',
  'Throughput': 'Объём выполненной работы', 'Working for you': 'Работают для вас',
  'needs you': 'требует внимания', 'ready': 'готово', 'building': 'создаётся',
  'captions and music added': 'субтитры и музыка добавлены',
  '→ rendering first cut': '→ подготовка первого монтажа',
  '→ compare side by side': '→ сравнить рядом', 'reply drafted': 'ответ подготовлен',
  '→ fix thread opened': '→ открыт диалог для исправления',
  'Select elements in a Browser tab, comment on them, and add them to the prompt.':
    'Выбирайте элементы во вкладке Browser, комментируйте их и добавляйте к запросу.',
  'Routes Claude and Codex API traffic across provider account pools.':
    'Распределяет обращения к API Claude и Codex между группами аккаунтов провайдеров.',
  'Schedule recurring and one-shot agent or script work.':
    'Запускает агентов и скрипты по расписанию: однократно или регулярно.',
  'Run durable, provider-independent agent workflows.':
    'Выполняет сохраняемые рабочие процессы агентов независимо от провайдера.',
  'Let BB control the in-app browser and browsers on connected machines, with inline previews for headless sessions.':
    'Позволяет BB управлять встроенным браузером и браузерами на подключённых компьютерах; показывает предпросмотр фоновых сеансов в чате.',
  'Control the number of concurrent threads that are running in bb':
    'Управляет количеством диалогов, одновременно работающих в bb.',
  'Edit files in BB with the Monaco editor instead of the read-only preview.':
    'Позволяет редактировать файлы в BB через Monaco вместо предпросмотра только для чтения.',
  'Keeps selected macOS and Windows hosts awake while bb is running.':
    'Не даёт выбранным компьютерам с macOS и Windows засыпать, пока работает bb.',
  'Add persistent custom instructions to agent tasks on this bb host.':
    'Добавляет постоянные инструкции к задачам агентов на этом компьютере с bb.',
  'Save a composer draft as a manually sent queued message.':
    'Сохраняет черновик запроса в очереди для последующей ручной отправки.',
  'Schedule the current composer draft to send at a later time.':
    'Планирует отправку текущего черновика запроса на более позднее время.',
  'Securely request credentials from a user and reconcile them into dotenv files.':
    'Безопасно запрашивает учётные данные пользователя и записывает их в файлы dotenv.',
  'Run bb threads with Claude Code.': 'Запускает диалоги bb через Claude Code.',
  'Run bb threads with Codex.': 'Запускает диалоги bb через Codex.',
  'Run bb threads with Pi.': 'Запускает диалоги bb через Pi.',
  'Run bb threads with ACP agents (supports Cursor, opencode, omp and more).':
    'Запускает диалоги bb через агентов ACP; поддерживает Cursor, opencode, omp и другие.',
  'Retry turns after transient provider errors and when subscription limits reset.':
    'Повторяет запросы после временных ошибок провайдера и обновления лимитов подписки.',
  'Unified encrypted catalog of API keys, FTP/SFTP, SSH, and logins with agent access on every enrolled machine.':
    'Единый зашифрованный каталог ключей API, доступов FTP/SFTP, SSH и логинов для агентов на всех подключённых компьютерах.',
  'Run a thread in a fresh git worktree on an enrolled machine':
    'Запускает диалог в новом git worktree на подключённом компьютере.',
  "Run a thread in the project's own checkout on an enrolled machine, on the branch you choose":
    'Запускает диалог в основном каталоге проекта на подключённом компьютере, в выбранной ветке.',
  'Give every thread without a project its own personal workspace on the machine':
    'Выделяет каждому диалогу без проекта личный рабочий каталог на компьютере.',
  'Browse the bb plugin API as an annotated map of the product.':
    'Показывает API плагинов bb в виде карты продукта с пояснениями.',
  'Exercise and inspect bb plugin API surfaces during development.':
    'Позволяет проверять и исследовать API плагинов bb при разработке.',
  'Control bb from ChatGPT, Claude and other MCP clients.':
    'Позволяет управлять bb из ChatGPT, Claude и других клиентов MCP.',
  'Search previous prompts, star favorites, and insert them into the composer.':
    'Ищет предыдущие запросы, сохраняет избранные и вставляет их в поле ввода.',
  "Preview PDF files with the browser's built-in viewer.":
    'Открывает PDF во встроенном просмотрщике браузера.',
  'Git status, changed files and the Diff tab for each environment':
    'Показывает состояние Git, изменённые файлы и вкладку Diff для каждого окружения.',
  "GitHub pull request status and actions for each environment's branch":
    'Показывает состояние pull request на GitHub и доступные действия для ветки каждого окружения.',
  'Asks once for a GitHub star after you have sent a few prompts.':
    'После нескольких запросов один раз предлагает поставить звезду на GitHub.',
  'Inspect machine storage and automatically archive or delete old threads.':
    'Проверяет место на компьютере и автоматически архивирует или удаляет старые диалоги.',
  'Control the BB introduction and bundled agent skills.':
    'Управляет вводными материалами BB и встроенными навыками агентов.',
  'Thread titles, commit messages, and voice input from bb cloud, included with your bb account.':
    'Создаёт заголовки диалогов, сообщения коммитов и распознаёт голос через bb cloud; входит в аккаунт bb.',
  'Notifications for threads that need attention on mobile, web, and desktop':
    'Отправляет уведомления о диалогах, требующих внимания, на телефон, в браузер и на компьютер.',
  'Reply to messages in hidden side-chat forks rendered in a thread panel.':
    'Позволяет отвечать в скрытых ответвлениях диалога, открытых в боковой панели.',
  'View provider usage in plugin settings and an optional sidebar footer card.':
    'Показывает использование провайдера в настройках плагина и, при желании, внизу боковой панели.',
  "bb's sidebar thread list: pinned threads, custom sections, projects, machines, and nested threads.":
    'Список диалогов в боковой панели bb: закреплённые, пользовательские разделы, проекты, компьютеры и вложенные диалоги.',
  "bb's sidebar navigation: the Rail and Top list layouts for New thread, Plugins, Skills, Automations, and plugin panels.":
    'Навигация боковой панели bb: узкая панель значков или верхний список для разделов New thread, Plugins, Skills, Automations и панелей плагинов.',
  'BB projects as Telegram topics: agent reports and summaries, Tasks events, and chat with BB threads by text or voice.':
    'Проекты BB в виде тем Telegram: отчёты и итоги агентов, события Tasks, общение с диалогами BB текстом и голосом.',
  "Shows your team's Claude Code, Codex and Grok subscriptions: what is left of each limit, when it runs out, who used it, and what it costs. Installs ai-usage on this machine when it is missing.":
    'Показывает подписки команды на Claude Code, Codex и Grok: остатки лимитов, сроки их исчерпания, использование и стоимость. Устанавливает ai-usage на этом компьютере, если программа отсутствует.',
  "Let any provider ask the user a multiple-choice question, the way Claude Code's AskUserQuestion does natively.":
    'Позволяет любому провайдеру задать пользователю вопрос с вариантами ответа, как это делает встроенный AskUserQuestion в Claude Code.',
  "bb's composer: the prompt box with rich text, @-mentions, slash commands, voice and attachments.":
    'Поле ввода bb: форматированный текст, @-упоминания, slash-команды, голосовой ввод и вложения.',
  "Beta: also reach this bb at https://<label>.next.<your bb account's domain> through bb's Fly gate, next to bb connect.":
    "Бета-версия: дополнительный доступ к этому bb по адресу https://<label>.next.<your bb account's domain> через шлюз Fly, параллельно с bb connect.",
  'Signs this bb in to your getbb.app account and holds its server credential for remote access and hosted services.':
    'Подключает этот bb к аккаунту getbb.app и хранит серверные учётные данные для удалённого доступа и облачных сервисов.',
  'Remote access via getbb.app — this bb becomes reachable at https://<handle>.getbb.app. Disable to cut off all remote access.':
    'Удалённый доступ через getbb.app: этот bb доступен по адресу https://<handle>.getbb.app. Отключение закрывает весь удалённый доступ.',
  'Show HTML visualizations inline in assistant messages, written in the reply as a fenced block or read from a workspace or thread-storage file, and Markdown documents from a file.':
    'Показывает HTML-визуализации в сообщениях агента: из блока кода в ответе или из файла проекта либо хранилища диалога; также отображает документы Markdown из файлов.',
};
